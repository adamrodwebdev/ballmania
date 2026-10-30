import { mkdirSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CAMPAIGN, WORLDS, type CampaignLevel } from '@/levels/campaign';
import { resolveLevel } from '@/levels/resolveLevel';
import { FRAMES, type FrameKind } from '@/levels/tracks';
import { assistanceOf } from '@/player/rewards';
import { CRAWL } from './bands';
import { boardOn, SCREENS, SURVEYED_IDS, type Screen } from './boards';
import { AIMING, playRobotOn, robotOf, type BotResult, type Newcomer } from './bot';

/**
 * Each level as phone and desktop players meet it (v1.8.1, spec § 3.17): the
 * newcomers on each screen, on the board the game gives that level there
 * (`boards.ts`), 96 sequences of colours the tuning tool never plays, one
 * hand each, so that it checks the tool on games it has not seen; the typical
 * newcomer on every screen, the slow one at the finger too, then with the
 * help its world offers after repeated defeats. No level may crawl there.
 *
 * `DEVICES=nebula npx vitest run tests/levels/devices.test.ts` writes the
 * tables of a world to `reports/appareils-nebula.md`; `DEVICES=all`, of every world.
 */
const COLOURS = Array.from({ length: 96 }, (_, i) => `screen-${i}`);
/** Past this share of its track, the head of a chain makes a near miss. */
const NEAR_MISS = 0.8;
const BOARD_NAMES: Readonly<Record<FrameKind, string>> = {
  square: 'carré',
  portrait: 'portrait',
  landscape: 'paysage',
  tall: 'haut',
  wide: 'large',
};

/** A newcomer's games on a screen, with or without the assistance (the chain slowed, § 3.2). */
const play = (
  level: CampaignLevel,
  screen: Screen,
  { newcomer, assisted = false }: { readonly newcomer: Newcomer; readonly assisted?: boolean },
): BotResult[] => {
  const device = SCREENS[screen].device;
  const robot = robotOf(newcomer, device);
  const resolved = resolveLevel(level, FRAMES[boardOn(level, screen)], { aiming: AIMING[device] });
  const speed = resolved.speed * (assisted ? assistanceOf(level.world).speed : 1);
  return COLOURS.map((seed) =>
    playRobotOn({ ...resolved, speed }, seed, { robot, handSeed: `${seed}/hand` }),
  );
};

const median = (values: readonly number[]): number => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length === 0) return 0;
  return sorted.length % 2 === 1 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2;
};

const clock = (seconds: number): string =>
  `${Math.floor(seconds / 60)}:${String(Math.round(seconds % 60)).padStart(2, '0')}`;
const share = (value: number): string => `${Math.round(value * 100)} %`;
const wins = (games: readonly BotResult[]): number =>
  games.filter((game) => game.outcome === 'won').length / games.length;

/** "1-3" for the third level of the first world. */
const label = (level: CampaignLevel): string =>
  `${WORLDS.findIndex((world) => world.id === level.world) + 1}-${level.number}`;

/** A world as one screen's newcomers play it. */
interface Table {
  /** The Markdown table. */
  readonly text: string;
  /** The levels at which the typical newcomer crawls on this screen. */
  readonly crawling: readonly string[];
}

/** A world as one screen's newcomers play it, as a Markdown table. */
function table(levels: readonly CampaignLevel[], screen: Screen): Table {
  const finger = SCREENS[screen].device === 'finger';
  const lines = [
    `${SCREENS[screen].name} : ${COLOURS.length} suites de couleurs, une main chacune, par robot.`,
    '',
    `| Niveau | Plateau | Victoires typique |${finger ? ' lent | lent aidé |' : ''} Durée typique | Pointe typique | Quasi-défaites typique | Sous pression typique | En jeu à 5 min typique |`,
    `| ------ | ------- | ----------------- |${finger ? ' ---- | --------- |' : ''} ------------- | -------------- | ---------------------- | --------------------- | ---------------------- |`,
  ];
  const crawling: string[] = [];
  for (const level of levels) {
    const typical = play(level, screen, { newcomer: 'typical' });
    const slow = finger ? play(level, screen, { newcomer: 'slow' }) : null;
    const helped = finger ? play(level, screen, { newcomer: 'slow', assisted: true }) : null;
    const running = typical.filter((game) => game.outcome === 'timeout').length;
    if (running > CRAWL * typical.length) {
      crawling.push(`${label(level)} (${BOARD_NAMES[boardOn(level, screen)]})`);
    }
    lines.push(
      `| ${[
        label(level),
        BOARD_NAMES[boardOn(level, screen)],
        share(wins(typical)),
        ...(slow && helped ? [share(wins(slow)), share(wins(helped))] : []),
        clock(median(typical.filter((game) => game.outcome === 'won').map((game) => game.elapsed))),
        share(median(typical.map((game) => game.danger))),
        `${typical.filter((game) => game.danger >= NEAR_MISS).length}/${typical.length}`,
        share(median(typical.map((game) => game.pressure / Math.max(1, game.elapsed)))),
        `${running}/${typical.length}`,
      ].join(' | ')} |`,
    );
  }
  return { text: lines.join('\n'), crawling };
}

describe('levels on the phone and on the desktop (v1.8.1)', () => {
  it('knows the board of every campaign level on every screen', () => {
    expect([...SURVEYED_IDS].sort()).toEqual(CAMPAIGN.map((level) => level.id).sort());
    for (const level of CAMPAIGN) {
      for (const screen of ['phone', 'phoneFull', 'desktop', 'window'] as const) {
        expect(Object.keys(FRAMES)).toContain(boardOn(level, screen));
      }
    }
  });

  const selected = process.env.DEVICES;
  it.runIf(selected)(
    "writes a world's tables",
    () => {
      const worlds = WORLDS.filter((world) => selected === 'all' || world.id === selected);
      expect(worlds.length, `DEVICES=${selected ?? ''}`).toBeGreaterThan(0);
      mkdirSync('reports', { recursive: true });
      for (const world of worlds) {
        const tables = (Object.keys(SCREENS) as Screen[]).map((screen) =>
          table(world.levels, screen),
        );
        const text = tables.map((found) => found.text).join('\n\n');
        writeFileSync(`reports/appareils-${world.id}.md`, `${text}\n`);
        console.log(`\n${text}\n`);
        // The tables first, so that a level that crawls is seen in its figures.
        expect(
          tables.flatMap((found) => found.crawling),
          `${world.id}: levels that crawl`,
        ).toEqual([]);
      }
    },
    10_800_000,
  );
});
