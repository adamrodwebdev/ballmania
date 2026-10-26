import { describe, expect, it } from 'vitest';
import { WORLDS, findLevel, type CampaignLevel } from '@/levels/campaign';
import { FRAMES, type FrameKind } from '@/levels/tracks';
import { PLAYERS, playLevel, type BotResult } from './bot';

/**
 * The tension of a world, for its table (v1.8.0, step 5): each level played
 * by the newcomer and by the casual player on the three boards, with the
 * wins, the time, the peak of the chain, the time under pressure (the head
 * past half its track), the near misses (past four fifths) and the dead time
 * (nothing on the board while balls wait in the tunnel).
 *
 * `TENSION=nebula npx vitest run tests/levels/tension.test.ts` prints the
 * tables of a world in the terminal, as Markdown; `TENSION=1` prints world 1.
 */
const FRAME_KINDS: readonly FrameKind[] = ['square', 'tall', 'wide'];
const SEEDS = Array.from({ length: 8 }, (_, i) => `tension-${i}`);
/** Past this share of its track, the head of a chain makes a near miss. */
const NEAR_MISS = 0.8;

type Player = keyof typeof PLAYERS;

const play = (level: CampaignLevel, player: Player, seeds: readonly string[]): BotResult[] => {
  const { cadence, sloppiness, insight } = PLAYERS[player];
  return FRAME_KINDS.flatMap((kind) =>
    seeds.map((seed) => playLevel(level, FRAMES[kind], seed, cadence, sloppiness, insight)),
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
const tenths = (value: number): string => value.toFixed(1).replace('.', ',');

/** "1-3" for the third level of the first world. */
const label = (level: CampaignLevel): string =>
  `${WORLDS.findIndex((world) => world.id === level.world) + 1}-${level.number}`;

/** A world's levels as one player plays them, as a Markdown table. */
function table(levels: readonly CampaignLevel[], player: Player): string {
  const lines = [
    `Robot ${player} : ${SEEDS.length} graines × ${FRAME_KINDS.length} plateaux par niveau.`,
    '',
    '| Niveau | Victoires | Durée | Pointe | Pointe max | Sous pression | Quasi-défaites | Temps mort | Maigre |',
    '| ------ | --------- | ----- | ------ | ---------- | ------------- | -------------- | ---------- | ------ |',
  ];
  for (const level of levels) {
    const games = play(level, player, SEEDS);
    const won = games.filter((game) => game.outcome === 'won');
    const peaks = games.map((game) => game.danger);
    lines.push(
      `| ${[
        label(level),
        `${won.length}/${games.length}`,
        clock(median(won.map((game) => game.elapsed))),
        share(median(peaks)),
        share(Math.max(...peaks)),
        share(median(games.map((game) => game.pressure / Math.max(1, game.elapsed)))),
        `${peaks.filter((peak) => peak >= NEAR_MISS).length}/${games.length}`,
        `${tenths(median(games.map((game) => game.idle)))} s`,
        `${tenths(median(games.map((game) => game.thin)))} s`,
      ].join(' | ')} |`,
    );
  }
  return lines.join('\n');
}

describe('tension of the campaign (v1.8.0)', () => {
  it.runIf(process.env.TENSION)(
    "prints a world's tables",
    () => {
      const world = process.env.TENSION === '1' ? 'nebula' : process.env.TENSION;
      const levels = WORLDS.find((candidate) => candidate.id === world)?.levels ?? [];
      expect(levels.length, `TENSION=${world ?? ''}`).toBeGreaterThan(0);
      for (const player of ['newcomer', 'casual'] as const)
        console.log(`\n${table(levels, player)}\n`);
    },
    600_000,
  );

  it('counts the time under pressure within the time played, more of it against the Colossus', () => {
    const pressure = (id: string) => {
      const games = play(findLevel(id)!, 'newcomer', SEEDS.slice(0, 2));
      for (const game of games) {
        expect(game.pressure, id).toBeGreaterThanOrEqual(0);
        expect(game.pressure, id).toBeLessThanOrEqual(game.elapsed);
      }
      return games.reduce((sum, game) => sum + game.pressure / Math.max(1, game.elapsed), 0);
    };
    expect(pressure('nebula-12')).toBeGreaterThan(pressure('nebula-01'));
  }, 60_000);
});
