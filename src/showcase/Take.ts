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
import type { Moment } from './moments';
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
  /** What the player wears; each moment keeps its own world's board. */
  readonly equipped: Readonly<Record<CosmeticSlot, string>>;
  /** The player's level of effects. */
  readonly effects: EffectLevel;
  /** One still image (reduced motion): no shaking, no slow motion. */
  readonly still: boolean;
}

/** A moment to play, where, and how it looks. */
export interface TakeOptions {
  readonly moment: Moment;
  readonly canvas: SpriteCanvas;
  readonly style: ReelStyle;
  /** The board's shape: the title's window has the wide one. */
  readonly frame?: Frame;
  /** Shock waves that bend the picture (a trailer's WebGL layer); none in the reel. */
  readonly distortion?: DistortionLayer | null;
}

/**
 * A moment of the reel being played (v1.8.0): the game's own play session,
 * on a canvas of its own, silent, driven frame by frame by its run. The
 * portal trailers film the same moments.
 */
export class Take {
  readonly moment: Moment;
  readonly canvas: SpriteCanvas;
  readonly run: MomentRun;
  private readonly session: PlaySession;
  private readonly night: boolean;

  constructor({ moment, canvas, style, frame = FRAMES.wide, distortion = null }: TakeOptions) {
    this.moment = moment;
    this.canvas = canvas;
    const look = resolveLook({ ...style.equipped, board: 'board-world' }, moment.world);
    this.night = look.theme.night;
    this.session = new PlaySession({
      canvas,
      distortion,
      level: moment.level(frame),
      palette: this.paletteOf(style.palettes),
      profile: EffectProfile.for(style.effects, style.still),
      feedback: { sound: new SoundEngine(0, () => null), haptics: new Haptics(false, null) },
      look,
      seed: () => moment.seed,
      aimAssist: true,
    });
    this.run = new MomentRun(moment, new SessionStage(this.session));
  }

  /** The window's CSS size, and its device pixels per CSS pixel. */
  resize(width: number, height: number, ratio: number): void {
    this.session.resize(width, height, ratio);
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
