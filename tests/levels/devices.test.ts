import { mkdirSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { WORLDS, type CampaignLevel } from '@/levels/campaign';
import { FRAMES } from '@/levels/tracks';
import { BOARD_OF, playRobot, robotOf, type BotResult, type Device, type Newcomer } from './bot';

/**
 * Each level as phone and desktop players meet it (v1.8.1, spec § 3.17): the
 * three newcomers on each device, on its own board, 24 sequences of colours
 * each played by three hands, 72 games a robot.
 *
 * `DEVICES=nebula npx vitest run tests/levels/devices.test.ts` writes the
 * tables of a world to `reports/appareils-nebula.md`; `DEVICES=all`, of every world.
 */
const COLOURS = Array.from({ length: 24 }, (_, i) => `tension-${i}`);
const HANDS = 3;
/** Past this share of its track, the head of a chain makes a near miss. */
const NEAR_MISS = 0.8;
const DEVICE_NAMES: Readonly<Record<Device, string>> = { finger: 'Téléphone', mouse: 'Ordinateur' };

const play = (level: CampaignLevel, device: Device, newcomer: Newcomer): BotResult[] => {
  const robot = robotOf(newcomer, device);
  const frame = FRAMES[BOARD_OF[device]];
  return COLOURS.flatMap((seed) =>
    Array.from({ length: HANDS }, (_, hand) =>
      playRobot(level, frame, seed, robot, `${seed}/${hand}`),
    ),
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

/** A world as one device's three newcomers play it, as a Markdown table. */
function table(levels: readonly CampaignLevel[], device: Device): string {
  const lines = [
    `${DEVICE_NAMES[device]} (plateau ${BOARD_OF[device] === 'tall' ? 'haut' : 'large'}) : ${COLOURS.length} suites de couleurs × ${HANDS} mains par robot.`,
    '',
    '| Niveau | Victoires typique | lent | vif | Durée typique | Pointe typique | Quasi-défaites typique | Sous pression typique |',
    '| ------ | ----------------- | ---- | --- | ------------- | -------------- | ---------------------- | --------------------- |',
  ];
  for (const level of levels) {
    const games = {
      typical: play(level, device, 'typical'),
      slow: play(level, device, 'slow'),
      quick: play(level, device, 'quick'),
    };
    const typical = games.typical;
    lines.push(
      `| ${[
        label(level),
        share(wins(typical)),
        share(wins(games.slow)),
        share(wins(games.quick)),
        clock(median(typical.filter((game) => game.outcome === 'won').map((game) => game.elapsed))),
        share(median(typical.map((game) => game.danger))),
        `${typical.filter((game) => game.danger >= NEAR_MISS).length}/${typical.length}`,
        share(median(typical.map((game) => game.pressure / Math.max(1, game.elapsed)))),
      ].join(' | ')} |`,
    );
  }
  return lines.join('\n');
}

describe('levels on the phone and on the desktop (v1.8.1)', () => {
  const selected = process.env.DEVICES;
  it.runIf(selected)(
    "writes a world's tables",
    () => {
      const worlds = WORLDS.filter((world) => selected === 'all' || world.id === selected);
      expect(worlds.length, `DEVICES=${selected ?? ''}`).toBeGreaterThan(0);
      mkdirSync('reports', { recursive: true });
      for (const world of worlds) {
        const text = (['finger', 'mouse'] as const)
          .map((device) => table(world.levels, device))
          .join('\n\n');
        writeFileSync(`reports/appareils-${world.id}.md`, `${text}\n`);
        console.log(`\n${text}\n`);
      }
    },
    3_600_000,
  );
});
