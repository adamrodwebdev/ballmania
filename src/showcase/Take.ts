import { SoundEngine } from '@/audio/SoundEngine';
import { FRAMES, type Frame } from '@/levels/tracks';
import type { SpriteCanvas } from '@/play/canvas';
import { resolveLook } from '@/play/cosmetics/Look';
import type { DistortionLayer } from '@/play/effects/DistortionLayer';
import { EffectProfile } from '@/play/effects/EffectProfile';
import { Haptics } from '@/play/Haptics';
import type { Palette } from '@/play/Palette';
import { PlaySession } from '@/play/PlaySession';
import type { CosmeticSlot } from '@/player/catalog';
import type { EffectLevel } from '@/services/SettingsService';
import type { Scene } from './moments';
import { MomentRun } from './MomentRun';
import { SessionStage } from './stage';

/** A day world's board follows the theme; a night one keeps the cosmos colours (§ 3.5). */
export interface ReelPalettes {
  readonly day: Palette;
  readonly night: Palette;
}

/** How every moment of the reel looks. */
export interface ReelStyle {
  readonly palettes: ReelPalettes;
  /** What the player wears; each moment keeps its own world's board, unless it shows the player's. */
  readonly equipped: Readonly<Record<CosmeticSlot, string>>;
  /** The player's level of effects. */
  readonly effects: EffectLevel;
  /** One still image (reduced motion): no shaking, no slow motion. */
  readonly still: boolean;
}

/** A scene to play, where, and how it looks. */
export interface TakeOptions {
  readonly scene: Scene;
  readonly canvas: SpriteCanvas;
  readonly style: ReelStyle;
  /** The board's shape: the title's window has the wide one. */
  readonly frame?: Frame;
  /** Shock waves that bend the picture (a trailer's WebGL layer); none in the reel. */
  readonly distortion?: DistortionLayer | null;
}

/** The part of a take's canvas a window shows, in its device pixels. */
export interface Crop {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/**
 * A scene being played (v1.8.0): the game's own play session, on a canvas of
 * its own, silent, driven frame by frame by its run. The title's reel and the
 * portal trailers play the reel's moments; the Workshop's fitting room plays
 * a cosmetic's scene, closer up: its canvas is then `zoom` times the
 * window's, which shows the part around the scene's focus.
 */
export class Take {
  readonly scene: Scene;
  readonly canvas: SpriteCanvas;
  readonly run: MomentRun;
  private readonly session: PlaySession;
  private readonly night: boolean;
  private readonly zoom: number;
  /** The scene's focus on the canvas, in device pixels, once the chain is in place. */
  private focus: { readonly x: number; readonly y: number } | null = null;
  private window = { width: 1, height: 1 };

  constructor({ scene, canvas, style, frame = FRAMES.wide, distortion = null }: TakeOptions) {
    this.scene = scene;
    this.canvas = canvas;
    const equipped = scene.ownBoard ? style.equipped : { ...style.equipped, board: 'board-world' };
    const look = resolveLook(equipped, scene.world);
    this.night = look.theme.night;
    this.zoom = Math.max(1, scene.framing?.zoom ?? 1);
    this.session = new PlaySession({
      canvas,
      distortion,
      level: scene.level(frame),
      palette: this.paletteOf(style.palettes),
      profile: EffectProfile.for(style.effects, style.still),
      feedback: { sound: new SoundEngine(0, () => null), haptics: new Haptics(false, null) },
      look,
      seed: () => scene.seed,
      aimAssist: true,
    });
    this.run = new MomentRun(scene, new SessionStage(this.session));
  }

  /** The window's CSS size, and its device pixels per CSS pixel. */
  resize(width: number, height: number, ratio: number): void {
    this.window = { width: Math.round(width * ratio), height: Math.round(height * ratio) };
    this.session.resize(width * this.zoom, height * this.zoom, ratio);
    this.focus = null;
  }

  /** The part of its canvas the window shows: all of it, or the part around its focus. */
  crop(): Crop {
    const { width, height } = this.canvas;
    const framing = this.scene.framing;
    if (!framing || this.zoom === 1) return { x: 0, y: 0, width, height };
    const shown = {
      width: Math.min(width, this.window.width),
      height: Math.min(height, this.window.height),
    };
    // Read once the chain has come to rest: the scene plays the same from there.
    if (!this.focus && this.run.settled) {
      this.focus = this.session.deviceOf(framing.focus(this.session.playing));
    }
    const centre = this.focus ?? { x: width / 2, y: height / 2 };
    const clamp = (value: number, room: number) => Math.max(0, Math.min(room, value));
    return {
      x: clamp(centre.x - shown.width / 2, width - shown.width),
      y: clamp(centre.y - shown.height / 2, height - shown.height),
      ...shown,
    };
  }

  setPalettes(palettes: ReelPalettes): void {
    this.session.setPalette(this.paletteOf(palettes));
  }

  destroy(): void {
    this.session.destroy();
    // Its pixels go now, not whenever the garbage collector comes.
    this.canvas.width = 0;
    this.canvas.height = 0;
  }

  private paletteOf(palettes: ReelPalettes): Palette {
    return this.night ? palettes.night : palettes.day;
  }
}
