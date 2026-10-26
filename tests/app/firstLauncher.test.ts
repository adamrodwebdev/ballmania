import { describe, expect, it } from 'vitest';
import type { AppServices } from '@/app/AppServices';
import { createMode } from '@/app/modes';
import { WORLDS } from '@/levels/campaign';
import { FRAMES, type FrameKind } from '@/levels/tracks';
import { nextLauncher } from '@/player/catalog';
import { PlayerProfile } from '@/player/PlayerProfile';
import { CampaignProgress } from '@/services/CampaignProgress';
import { MemoryStorage } from '@/services/KeyValueStorage';
import { PLAYERS, playLevel } from '../levels/bot';

/**
 * The first launcher (v1.8.0, step 7): a newcomer plays world 1 in order,
 * paid as the game pays (wins, stars, goals), retries a level until it is
 * won, and taps « Équiper » on the victory panel whenever a launcher's bar is
 * full. `ECONOMY=1 npx vitest run tests/app/firstLauncher.test.ts` prints the
 * balance after each level, as Markdown.
 */
const FRAME_KINDS: readonly FrameKind[] = ['square', 'tall', 'wide'];
const SEEDS = ['first-a', 'first-b', 'first-c', 'first-d'];
const WORLD_1 = WORLDS[0]!.levels;
const { cadence, sloppiness, insight } = PLAYERS.newcomer;

interface Journey {
  readonly name: string;
  /** Shards left after each level's victory panel. */
  readonly balances: readonly number[];
  /** Each launcher worn from a victory panel, and the level of that panel. */
  readonly equips: readonly { readonly id: string; readonly level: number }[];
}

function journey(kind: FrameKind, seed: string): Journey {
  const storage = new MemoryStorage();
  const player = new PlayerProfile(storage);
  const services = { progress: new CampaignProgress(storage), player } as unknown as AppServices;
  const balances: number[] = [];
  const equips: { id: string; level: number }[] = [];
  for (const level of WORLD_1) {
    const mode = createMode({ kind: 'campaign', level });
    for (let attempt = 0; attempt < 5; attempt++) {
      const { report } = playLevel(
        level,
        FRAMES[kind],
        `${seed}-${attempt}`,
        cadence,
        sloppiness,
        insight,
      );
      mode.settle(report, services);
      if (report.outcome === 'won') break;
    }
    // The victory panel: each tap buys and wears the launcher its bar aims at.
    let goal = nextLauncher((id) => player.owns(id));
    while (goal && player.buy(goal.id)) {
      player.equip(goal.id);
      equips.push({ id: goal.id, level: level.number });
      goal = nextLauncher((id) => player.owns(id));
    }
    balances.push(player.shards);
  }
  return { name: `${kind} ${seed}`, balances, equips };
}

const journeys = () => FRAME_KINDS.flatMap((kind) => SEEDS.map((seed) => journey(kind, seed)));

const median = (values: readonly number[]): number => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2;
};

describe('the first launcher (v1.8.0)', () => {
  it('lets a newcomer wear the Crown from a victory panel by 1-3 at the latest', () => {
    for (const { name, equips } of journeys()) {
      expect(equips[0], name).toMatchObject({ id: 'shooter-crown' });
      expect(equips[0]!.level, name).toBeLessThanOrEqual(3);
    }
  }, 120_000);

  it.runIf(process.env.ECONOMY)(
    'prints the balance after each level of world 1',
    () => {
      const all = journeys();
      const firstAt = (id: string, level: number) =>
        all.filter((one) => one.equips.some((equip) => equip.id === id && equip.level === level))
          .length;
      const lines = [
        `Robot nouveau venu : ${SEEDS.length} graines × ${FRAME_KINDS.length} plateaux.`,
        '',
        '| Niveau | Solde médian | Solde min. | Solde max. | Couronne équipée | Halo équipé | Œil équipé |',
        '| ------ | ------------ | ---------- | ---------- | ---------------- | ----------- | ---------- |',
        ...WORLD_1.map((level, index) => {
          const balances = all.map((one) => one.balances[index]!);
          return `| 1-${level.number} | ${median(balances)} | ${Math.min(...balances)} | ${Math.max(...balances)} | ${firstAt('shooter-crown', level.number)}/${all.length} | ${firstAt('shooter-halo', level.number)}/${all.length} | ${firstAt('shooter-eye', level.number)}/${all.length} |`;
        }),
      ];
      console.log(`\n${lines.join('\n')}\n`);
    },
    300_000,
  );
});
