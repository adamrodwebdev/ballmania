import { describe, expect, it } from 'vitest';
import {
  defeatMotif,
  easeTempo,
  eventsAt,
  isMinor,
  stepSeconds,
  STEPS_PER_BAR,
  TEMPO_RISE,
  tempoTarget,
  THEMES,
  type MusicThemeId,
} from '@/audio/score';
import { WORLDS } from '@/levels/campaign';
import { GRACE_FROM } from '@/levels/grace';
import { ALARM_FROM, MUSIC_FROM, TENSION_TIERS, tensionTier, TIER_SLACK } from '@/play/dangerCues';

describe('the score', () => {
  it('has a theme for the menus and for every world, each a loop of whole bars', () => {
    const ids = Object.keys(THEMES) as MusicThemeId[];
    expect(ids).toContain('title');
    for (const world of WORLDS) expect(ids).toContain(world.id);
    for (const theme of Object.values(THEMES)) {
      for (const pattern of [
        theme.bass.pattern,
        theme.arp.pattern,
        theme.kick,
        theme.snare,
        theme.hat,
      ]) {
        expect(pattern).toHaveLength(STEPS_PER_BAR);
        for (const level of pattern) expect(level).toBeGreaterThanOrEqual(0);
      }
      expect(theme.chords.length).toBeGreaterThan(0);
      expect(theme.bpm).toBeGreaterThan(50);
      expect(theme.bpm).toBeLessThan(140);
    }
  });

  it('starts a chord on the first step of each bar and loops the progression', () => {
    const theme = THEMES.nebula;
    const first = eventsAt(theme, 0).pad;
    expect(first?.notes).toHaveLength(theme.chords[0]!.length);
    expect(first?.notes[0]).toBeCloseTo(theme.root);
    expect(first?.seconds).toBeCloseTo(stepSeconds(theme) * STEPS_PER_BAR);
    expect(eventsAt(theme, 1).pad).toBeNull();
    const loop = theme.chords.length * STEPS_PER_BAR;
    expect(eventsAt(theme, loop).pad).toEqual(first);
    expect(eventsAt(theme, STEPS_PER_BAR).pad).not.toEqual(first);
  });

  it('plays the bass an octave down and climbs the chord with the arpeggio', () => {
    const theme = THEMES.nebula;
    expect(eventsAt(theme, 0).bass?.note).toBeCloseTo(theme.root / 2);
    const notes = [0, 1, 2, 3].map((step) => eventsAt(theme, step).arp?.note ?? 0);
    expect(notes[1]).toBeGreaterThan(notes[0]!);
    expect(notes[2]).toBeGreaterThan(notes[1]!);
  });

  it('lays the tension over a calm theme, tier by tier (v1.8.1)', () => {
    const bar = (tier: number) =>
      Array.from({ length: STEPS_PER_BAR }, (_, step) => eventsAt(THEMES.abyss, step, tier));
    const count = (tier: number, part: 'kick' | 'snare' | 'hat') =>
      bar(tier).filter((events) => events[part] > 0).length;
    const basses = (tier: number) => bar(tier).filter((events) => events.bass).length;
    // Calm: the theme as written, without drums.
    expect([count(0, 'kick'), count(0, 'snare'), count(0, 'hat'), basses(0)]).toEqual([0, 0, 0, 1]);
    // From half the track: a bass on every eighth, the hi-hat between the beats.
    expect([count(1, 'kick'), count(1, 'hat'), basses(1)]).toEqual([0, 4, 8]);
    // From the alarm: the four beats, the backbeat, sixteenths.
    expect([count(2, 'kick'), count(2, 'snare'), count(2, 'hat')]).toEqual([4, 2, 16]);
    // Near the hole: the kick doubled, and a roll swelling into the next bar.
    expect(count(3, 'kick')).toBe(8);
    const roll = bar(3)
      .slice(13)
      .map((events) => events.snare);
    expect(roll).toEqual([...roll].sort((a, b) => a - b));
    expect(roll[0]).toBeGreaterThan(0);
    // A theme's own parts stay: the Nebula keeps its snare on the backbeat at every tier.
    expect(eventsAt(THEMES.nebula, 4, 0).snare).toBeGreaterThan(0);
    expect(eventsAt(THEMES.nebula, 4, 3).snare).toBeGreaterThanOrEqual(
      eventsAt(THEMES.nebula, 4, 0).snare,
    );
  });

  it('brings each tier in at its danger cue, and lets it go a little below (v1.8.1)', () => {
    expect(TENSION_TIERS).toEqual([MUSIC_FROM, ALARM_FROM, GRACE_FROM]);
    expect([0.3, 0.5, 0.7, 0.85].map((share) => tensionTier(0, share))).toEqual([0, 1, 2, 3]);
    // No flicker at an edge: a tier stays until the chain is back by the slack.
    expect(tensionTier(3, GRACE_FROM - TIER_SLACK / 2)).toBe(3);
    expect(tensionTier(3, GRACE_FROM - TIER_SLACK - 0.01)).toBe(2);
    expect(tensionTier(2, ALARM_FROM - 0.02)).toBe(2);
    expect(tensionTier(1, ALARM_FROM - 0.02)).toBe(1);
    // A big reaction pushes the chain far back: the music calms at once.
    expect(tensionTier(3, 0.2)).toBe(0);
  });

  it('raises the tempo from the alarm on, up to 15 % at the hole, and relaxes without a jolt', () => {
    expect(TEMPO_RISE).toBeCloseTo(0.15);
    expect(tempoTarget(0.4)).toBe(1);
    expect(tempoTarget(ALARM_FROM)).toBe(1);
    expect(tempoTarget(1)).toBeCloseTo(1 + TEMPO_RISE);
    expect(tempoTarget(0.9)).toBeGreaterThan(tempoTarget(0.8));
    // Followed a sixteenth at a time: never a jump, slower back down than up.
    const step = stepSeconds(THEMES.nebula);
    const follow = (from: number, to: number, seconds: number) => {
      let tempo = from;
      let jump = 0;
      for (let t = 0; t < seconds; t += step) {
        const next = easeTempo(tempo, to, step);
        jump = Math.max(jump, Math.abs(next - tempo));
        tempo = next;
      }
      return { tempo, jump };
    };
    const up = follow(1, 1 + TEMPO_RISE, 2);
    const down = follow(1 + TEMPO_RISE, 1, 2);
    expect(up.jump).toBeLessThan(0.015);
    expect(up.tempo - 1).toBeGreaterThan(1 + TEMPO_RISE - down.tempo);
    expect(follow(1 + TEMPO_RISE, 1, 30).tempo).toBeCloseTo(1, 3);
  });

  it("falls to the root of each world's key at a defeat, mid-keyboard (v1.8.1)", () => {
    for (const theme of Object.values(THEMES)) {
      const motif = defeatMotif(theme.root, isMinor(theme));
      const pitches = motif.map((note) => note.frequency);
      expect(pitches).toHaveLength(4);
      for (let i = 1; i < pitches.length; i++) expect(pitches[i]).toBeLessThan(pitches[i - 1]!);
      const tonic = pitches.at(-1)!;
      expect(tonic).toBeGreaterThanOrEqual(280);
      expect(tonic).toBeLessThan(560);
      // The root's own note, octaves apart.
      expect(Math.log2(tonic / theme.root) % 1).toBeCloseTo(0);
      // The world's third: minor everywhere but in the lydian Jewel.
      expect(12 * Math.log2(pitches[1]! / tonic)).toBeCloseTo(theme === THEMES.jewel ? 4 : 3);
      // Over as the defeat screen opens, 1.6 s after the defeat (RESULT_DELAY).
      const last = motif.at(-1)!;
      expect(last.at + last.seconds).toBeLessThan(1.6);
    }
  });
});
