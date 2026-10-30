import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CAMPAIGN, WORLDS, type CampaignLevel } from '@/levels/campaign';
import { seatKey, type SeatKey } from '@/levels/seat';
import { FRAMES } from '@/levels/tracks';
import { bandOf, CRAWL, type Band } from './bands';
import { boardOn, seatsOf, type PlayedSeat } from './boards';
import { playRobot, robotOf, type BotResult } from './bot';

/**
 * The tuning tool (v1.8.1, spec § 3.17): for each campaign level and each
 * seat its screens give it (a board and a hand), the speed, then the length,
 * at which the typical newcomer's wins sit in the middle of the level's band.
 * Every step replays the same sequences of colours, one hand each, so that two
 * speeds compare fairly; the remeasure of the boards (devices.test.ts) plays
 * other sequences, so that it checks the tool on games it has not seen.
 *
 * `TUNE=nebula npx vitest run tests/levels/tune.test.ts` writes the world's
 * paces to `reports/tuning-nebula.json`; `LEVELS=6-1,6-2` tunes only those
 * levels (`reports/tuning-singularity-6-1_6-2.json`), to share a slow world
 * between processes or tune a level again. `TUNE=write` then turns every
 * report into `src/levels/tuning.data.ts`, the latest tuning of a level first.
 */
/**
 * 192 sequences of colours, one hand each: a game owes more to its colours
 * than to its hand. 24 sequences played by four hands left a level's figure
 * good to only about 7 points; 96 (29/10/2026) still put 2-8 at 68 % where
 * 192 sequences of neither tool gave it 60 % (30/10/2026).
 */
const COLOURS = Array.from({ length: 192 }, (_, i) => `tension-${i}`);
/**
 * The speed stays within 0.6 and 1.6 times the level's own: beyond, the robots'
 * guesses about people would decide more than the level (spec § 3.17). A level
 * that mixes colours, the world of reflection, may slow down to 0.45 times
 * (decided on 29/10/2026).
 */
const SLOWEST = 0.6;
const SLOWEST_MIXING = 0.45;
const FASTEST = 1.6;

/**
 * The tool keeps half a crawl's limit away from it, one game in forty, so that
 * games it has not seen stay under one in twenty (30/10/2026: 4-7 on the tall
 * board, at 4 games in 96 for the tool, crawled at 7 in the remeasure).
 */
const CLEAR_OF_CRAWL = CRAWL / 2;

/** The slowest a level may go: slower where colours mix. */
const slowestOf = (level: CampaignLevel): number => (level.palette ? SLOWEST_MIXING : SLOWEST);
/** Steps of the search, each a bracketing of the speed. */
const STEPS = 7;
/** A level too easy at its fastest grows by a quarter; too hard at its slowest, shrinks by a fifth. */
const LONGER = 1.25;
const SHORTER = 0.8;

interface Pace {
  readonly speed: number;
  readonly length: number;
}

interface Trial extends Pace {
  readonly wins: number;
  /** The share of games still running at the robots' cap. */
  readonly running: number;
}

/** How far a share of wins is from a band: 0 inside it. */
const offBand = (wins: number, [low, high]: Band): number =>
  wins < low ? low - wins : wins > high ? wins - high : 0;

/**
 * Where a band is aimed at, and how close counts as there: its middle, within
 * a quarter of its width; a band that reaches every win (the calm levels)
 * wants no defeat, so anywhere in it will do.
 */
const aimOf = ([low, high]: Band) =>
  high >= 1 ? { centre: 1, close: 1 - low } : { centre: (low + high) / 2, close: (high - low) / 4 };

/** How far a share of wins is from where its band is aimed at, out of the band first. */
const offAim = (wins: number, band: Band): number =>
  offBand(wins, band) * 10 + Math.abs(wins - aimOf(band).centre);

/** The typical newcomer's games at a seat, at a speed and a length (the tuning table aside). */
function trialAt(level: CampaignLevel, { board, device }: PlayedSeat, pace: Pace): Trial {
  // Another id: the table this tool writes never stands in for the pace tried.
  const probe = { ...level, id: `${level.id}:probe`, speed: pace.speed, length: pace.length };
  const robot = robotOf('typical', device);
  const games = COLOURS.map((seed) => playRobot(probe, FRAMES[board], seed, robot, `${seed}/tune`));
  const share = (outcome: BotResult['outcome']): number =>
    games.filter((game) => game.outcome === outcome).length / games.length;
  return { ...pace, wins: share('won'), running: share('timeout') };
}

/**
 * The pace that brings a level to where its band is aimed at, at a seat, or
 * the closest one found, never one at which it crawls. A pace close enough
 * is kept at once: the level's own pace first.
 */
function tune(level: CampaignLevel, seat: PlayedSeat): Trial {
  const band = bandOf(level);
  const { centre, close } = aimOf(band);
  let length = level.length;
  let best: Trial | null = null;
  let last: Trial | null = null;
  const slowest = slowestOf(level);
  for (let pass = 0; pass < 2; pass++) {
    let [slow, fast] = [slowest, FASTEST];
    let factor = 1;
    let crawled = false;
    for (let step = 0; step < STEPS; step++) {
      const trial = trialAt(level, seat, { speed: Math.round(level.speed * factor), length });
      last = trial;
      if (trial.running > CLEAR_OF_CRAWL) {
        // A crawl is never kept, and the search goes no slower.
        crawled = true;
        slow = factor;
      } else {
        if (!best || offAim(trial.wins, band) < offAim(best.wins, band)) best = trial;
        if (Math.abs(trial.wins - centre) <= close) return trial;
        if (trial.wins > centre) slow = factor;
        else fast = factor;
      }
      factor = Math.sqrt(slow * fast);
    }
    // Every pace tried crawls: the fastest of them stands.
    if (!best) break;
    // Out of the band by speed alone (the search ended at one of its bounds, or where the level
    // starts to crawl): the length moves once, then the speed again. In the band, or short of a
    // bound, the closest pace stands.
    const tooEasy = best.wins > band[1];
    const bound = tooEasy ? FASTEST : slowest;
    const atBound = Math.abs(Math.log(factor / bound)) < 0.05 || (!tooEasy && crawled);
    if (level.sequence || pass > 0 || !atBound || offBand(best.wins, band) === 0) break;
    length = Math.round(level.length * (tooEasy ? LONGER : SHORTER));
  }
  return best ?? last!;
}

type Report = Record<string, Partial<Record<SeatKey, Trial>>>;

/** The table of the game, from every report: only the seats whose pace moved. */
function tuningSource(reports: readonly Report[]): string {
  const found: Report = Object.assign({}, ...reports);
  const rows = CAMPAIGN.flatMap((level) => {
    const cells = Object.entries(found[level.id] ?? {})
      .filter(([, pace]) => pace.speed !== level.speed || pace.length !== level.length)
      .map(([seat, pace]) => {
        const length = pace.length === level.length ? '' : `, length: ${pace.length}`;
        return `    '${seat}': { speed: ${pace.speed}${length} },`;
      });
    return cells.length > 0 ? [`  '${level.id}': {`, ...cells, '  },'] : [];
  });
  return [
    '// Generated by `TUNE=write npx vitest run tests/levels/tune.test.ts` from the',
    "// tuning tool's reports: tune the levels again rather than editing these values.",
    "import type { SeatTable } from './seat';",
    '',
    '/** A pace the tuning tool found: the speed, and the length when it changed. */',
    'export interface TunedPace {',
    '  readonly speed: number;',
    '  readonly length?: number;',
    '}',
    '',
    '/**',
    " * Each campaign level's pace seat by seat (v1.8.1, spec § 3.17); a seat",
    " * missing here keeps its board's other hand's pace, else the level's own.",
    ' */',
    'export const TUNING: Readonly<Record<string, SeatTable<TunedPace>>> = {',
    ...rows,
    '};',
    '',
  ].join('\n');
}

describe('the tuning tool (v1.8.1)', () => {
  it("tunes each level at the seats its screens give it, a phone's at the finger", () => {
    const first = WORLDS[0]!.levels[0]!;
    const seats = seatsOf(first);
    expect(seats.size).toBeGreaterThan(1);
    expect(seats.get(seatKey({ board: boardOn(first, 'phone'), aiming: 'touch' }))).toBeDefined();
    expect(seats.get(seatKey({ board: boardOn(first, 'desktop'), aiming: 'mouse' }))).toBeDefined();
  });

  const selected = process.env.TUNE;
  it.runIf(selected && selected !== 'write')(
    "finds a world's paces",
    () => {
      const worlds = WORLDS.filter((world) => selected === 'all' || world.id === selected);
      expect(worlds.length, `TUNE=${selected ?? ''}`).toBeGreaterThan(0);
      mkdirSync('reports', { recursive: true });
      const only = process.env.LEVELS?.split(',');
      for (const world of worlds) {
        const number = WORLDS.indexOf(world) + 1;
        const levels = world.levels.filter(
          (level) => !only || only.includes(`${number}-${level.number}`),
        );
        const paces: Report = {};
        for (const level of levels) {
          const found: Partial<Record<SeatKey, Trial>> = {};
          for (const [key, seat] of seatsOf(level)) {
            found[key] = tune(level, seat);
            console.log(level.id, key, JSON.stringify(found[key]));
          }
          paces[level.id] = found;
        }
        const part = only ? `-${only.join('_')}` : '';
        writeFileSync(
          `reports/tuning-${world.id}${part}.json`,
          `${JSON.stringify(paces, null, 2)}\n`,
        );
      }
    },
    14_400_000,
  );

  it.runIf(selected === 'write')('writes the tuning table from the reports', () => {
    const reports = readdirSync('reports')
      .filter((name) => /^tuning-.+\.json$/.test(name))
      // Oldest first: a level tuned again keeps its latest paces.
      .sort((a, b) => statSync(`reports/${a}`).mtimeMs - statSync(`reports/${b}`).mtimeMs)
      .map((name) => JSON.parse(readFileSync(`reports/${name}`, 'utf8')) as Report);
    expect(reports.length).toBeGreaterThan(0);
    writeFileSync(
      new URL('../../src/levels/tuning.data.ts', import.meta.url),
      tuningSource(reports),
    );
  });
});
