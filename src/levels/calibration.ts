import type { CampaignLevel } from './campaign';
import { CALIBRATION } from './calibration.data';

/**
 * The reference time and the stars of the campaign levels (specification
 * § 3.2), calibrated on bots that play like people (tests/levels/
 * calibration.test.ts): the reference time is 1.2 × a careful player's
 * median time, the third star is reached by about 30 % of their games, the
 * second by about 80 % of a hasty player's wins. A level not calibrated yet
 * falls back on a model of the same player.
 */

/** Balls a level makes the player destroy: every chain's, and a third of a Colossus's health. */
export function ballsOf(level: CampaignLevel): number {
  const arms =
    level.track.kind === 'spiral' ? (level.track.arms ?? 1) : level.track.kind === 'twin' ? 2 : 1;
  return level.length * arms + (level.colossus ? level.colossus.hp / 3 : 0);
}

/** A careful player's time: a decision every 1.5 s, 0.16 × colours + 0.14 shots per ball. */
const carefulTime = (level: CampaignLevel): number =>
  1.5 * ballsOf(level) * (0.16 * level.tones + 0.14);

const round = (value: number) => Math.round(value / 50) * 50;

/** Seconds under which each second saved earns the time bonus. */
export function referenceTime(level: CampaignLevel): number {
  return CALIBRATION[level.id]?.[0] ?? Math.ceil(1.2 * carefulTime(level));
}

/**
 * Points of the second and third stars (the first is the win): a slightly
 * unlucky game for the second, whatever its time; for the third, an average
 * one played a tenth quicker than a careful player.
 */
export function calibratedStars(level: CampaignLevel): readonly [number, number] {
  const calibrated = CALIBRATION[level.id];
  if (calibrated) return [calibrated[1], calibrated[2]];
  const balls = ballsOf(level);
  return [round(300 + 30 * balls), round(300 + 32 * balls + 40 * 0.3 * carefulTime(level))];
}
