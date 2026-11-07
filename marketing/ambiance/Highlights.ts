import type { Plan } from './Composer';
import { OPENING } from './Composer';
import { peakOf } from './Direction';
import type { Mood } from './Mood';

/**
 * The moments taken out of a video (specification § 3.18): three Shorts,
 * each around the signature effect of a different section, five minutes
 * apart at least and clear of the fades, and the thumbnail's frame, the
 * richest moment of the opening. Pure.
 */

export interface Moment {
  /** Seconds from the start of the video. */
  readonly start: number;
  readonly seconds: number;
  readonly section: number;
}

/** Seconds of the Short before its peak: the effect swells in the first half. */
const LEAD = 0.4;

export function shorts(plan: Plan, mood: Mood, seconds: number, count = 3): readonly Moment[] {
  const earliest = mood.fade.in + 5;
  const latest = plan.seconds - mood.fade.out - 5 - seconds;
  if (latest - earliest < count * seconds) {
    // A video too short for its fades (a smoke test): Shorts one after another in its middle.
    const first = Math.max(0, (plan.seconds - count * seconds) / 2);
    return Array.from({ length: count }, (_, i) => ({
      start: first + i * seconds,
      seconds,
      section: 0,
    }));
  }
  const candidates = plan.sections
    .map((section) => ({
      section: section.index,
      energy: section.energy,
      start: Math.min(latest, Math.max(earliest, peakOf(plan, section.index) - seconds * LEAD)),
    }))
    .filter((c) => c.start >= earliest - 1e-9 && c.start <= latest + 1e-9)
    .sort((a, b) => b.energy - a.energy || a.start - b.start);
  // Five minutes apart in an hour; closer in a short video, never overlapping.
  const gap = Math.min(300, plan.seconds / (count + 1));
  const picked: Moment[] = [];
  for (const candidate of candidates) {
    if (picked.length === count) break;
    if (picked.some((m) => Math.abs(m.start - candidate.start) < Math.max(gap, seconds))) continue;
    picked.push({ start: candidate.start, seconds, section: candidate.section });
  }
  // Too few sections far enough apart: the next Shorts wherever they fit.
  for (let start = earliest; picked.length < count && start <= latest; start += 1) {
    if (!picked.some((m) => Math.abs(m.start - start) < seconds)) {
      const section = plan.sections.findIndex((x) => start < x.start + x.seconds);
      picked.push({ start, seconds, section });
    }
  }
  return picked.sort((a, b) => a.start - b.start);
}

/** The thumbnail's moment: the peak of the richest section of the opening, clear of the fade. */
export function thumbnailAt(plan: Plan, mood: Mood): number {
  const opening = plan.sections.filter((s) => s.start < OPENING);
  const best = [...(opening.length ? opening : plan.sections)].sort(
    (a, b) => b.energy - a.energy,
  )[0]!;
  const lowest = Math.min(plan.seconds / 2, mood.fade.in + 5);
  const highest = Math.max(lowest, plan.seconds - mood.fade.out - 5);
  return Math.min(highest, Math.max(lowest, peakOf(plan, best.index)));
}
