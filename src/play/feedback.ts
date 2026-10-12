import { SoundEngine } from '@/audio/SoundEngine';
import { Haptics } from './Haptics';
import type { Feedback } from './PlaySession';

let shared: Feedback | null = null;

/**
 * Sound and vibrations for the whole visit: one audio context, unlocked once,
 * kept from game to game. Created with the game screen, so the home page
 * never downloads it.
 */
export function sharedFeedback(volume: number, vibration: boolean): Feedback {
  shared ??= { sound: new SoundEngine(volume), haptics: new Haptics(vibration) };
  shared.sound.setVolume(volume);
  shared.haptics.setEnabled(vibration);
  return shared;
}
