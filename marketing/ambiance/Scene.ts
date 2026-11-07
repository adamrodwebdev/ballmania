import type { Palette } from '@/play/Palette';
import { AbyssTheme } from '@/play/themes/AbyssTheme';
import { JewelTheme } from '@/play/themes/JewelTheme';
import { NebulaTheme } from '@/play/themes/NebulaTheme';
import { NeonTheme } from '@/play/themes/NeonTheme';
import { SingularityTheme } from '@/play/themes/SingularityTheme';
import { VolcanoTheme } from '@/play/themes/VolcanoTheme';
import type { WorldTheme } from '@/play/themes/WorldTheme';
import type { SectionKind } from './Composer';
import type { FrameDirection } from './Direction';
import { LOOKS, type WorldLook } from './looks';
import type { Mood, WorldId } from './Mood';
import {
  BLUR_FRAGMENT,
  BRIGHT_FRAGMENT,
  FINISH_FRAGMENT,
  FULLSCREEN_VERTEX,
  MIX_FRAGMENT,
  PARTICLE_FRAGMENT,
  PARTICLE_VERTEX,
  SCENE_FRAGMENT,
} from './shaders';

/**
 * The picture of an ambience (specification § 3.18): the game's painted
 * backdrop of the world, then, in WebGL2, the living gas, the light, the
 * world's signature effect, particles at five depths, the halo, the colour
 * grade and the grain. Stateless: `draw(t)` gives the same pixels whatever
 * was drawn before. Nothing here ships with the game.
 */

const THEMES: Readonly<Record<WorldId, () => WorldTheme>> = {
  nebula: () => new NebulaTheme(),
  neon: () => new NeonTheme(),
  abyss: () => new AbyssTheme(),
  jewel: () => new JewelTheme(),
  volcano: () => new VolcanoTheme(),
  singularity: () => new SingularityTheme(),
};

const KINDS: readonly SectionKind[] = ['calm', 'bright', 'deep'];
/** The halo's levels: half, quarter… down to a sixty-fourth of the picture. */
const BLOOM_LEVELS = 5;

interface Target {
  readonly framebuffer: WebGLFramebuffer;
  readonly texture: WebGLTexture;
  readonly width: number;
  readonly height: number;
}

type Uniforms = Record<string, WebGLUniformLocation | null>;

interface Program {
  readonly program: WebGLProgram;
  readonly uniforms: Uniforms;
}

export interface SceneOptions {
  readonly width: number;
  readonly height: number;
  readonly mood: Mood;
  readonly palette: Palette;
  readonly seed: number;
}

export class Scene {
  readonly canvas: HTMLCanvasElement;
  private readonly gl: WebGL2RenderingContext;
  private readonly look: WorldLook;
  private readonly scenePass: Program;
  private readonly particlePass: Program;
  private readonly brightPass: Program;
  private readonly blurPass: Program;
  private readonly finishPass: Program;
  private readonly mixPass: Program;
  private readonly hdr: Target;
  private readonly bloom: readonly Target[];
  private readonly finished: Target;
  private readonly held: Target;
  private readonly backdrop: WebGLTexture;
  private readonly caption: WebGLTexture;
  private readonly hasCaption: boolean;
  private readonly particles: number;

  constructor(private readonly options: SceneOptions) {
    const { width, height, mood } = options;
    this.canvas = document.createElement('canvas');
    this.canvas.width = width;
    this.canvas.height = height;
    const gl = this.canvas.getContext('webgl2', {
      alpha: false,
      antialias: false,
      depth: false,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance',
    });
    if (!gl) throw new Error('WebGL2 is not available');
    if (!gl.getExtension('EXT_color_buffer_float')) throw new Error('No float render targets');
    this.gl = gl;
    this.look = LOOKS[mood.world];
    this.particles = Math.round(
      this.look.particles * mood.particles * Math.sqrt((width * height) / (1920 * 1080)),
    );
    this.scenePass = this.program(FULLSCREEN_VERTEX, SCENE_FRAGMENT);
    this.particlePass = this.program(PARTICLE_VERTEX, PARTICLE_FRAGMENT);
    this.brightPass = this.program(FULLSCREEN_VERTEX, BRIGHT_FRAGMENT);
    this.blurPass = this.program(FULLSCREEN_VERTEX, BLUR_FRAGMENT);
    this.finishPass = this.program(FULLSCREEN_VERTEX, FINISH_FRAGMENT);
    this.mixPass = this.program(FULLSCREEN_VERTEX, MIX_FRAGMENT);
    this.hdr = this.target(width, height, true);
    this.bloom = Array.from({ length: BLOOM_LEVELS }, (_, i) =>
      this.target(Math.max(1, width >> (i + 1)), Math.max(1, height >> (i + 1)), true),
    );
    this.finished = this.target(width, height, false);
    this.held = this.target(width, height, false);
    this.backdrop = this.paintBackdrop();
    this.hasCaption = mood.caption;
    this.caption = this.paintCaption();
    gl.bindVertexArray(gl.createVertexArray());
  }

  /** Draws the frame at `t` seconds into the finished target. */
  draw(t: number, direction: FrameDirection, frame: number): void {
    this.drawScene(t, direction);
    this.drawBloom();
    this.drawFinish(t, direction, frame, this.finished);
  }

  /** Shows the finished frame on the canvas. */
  present(): void {
    this.mixInto(null, this.finished, this.finished, 0);
  }

  /** Keeps the finished frame aside, for a cross-fade with the next one drawn. */
  hold(): void {
    this.mixInto(this.held, this.finished, this.finished, 0);
  }

  /** Shows the held frame and the finished one cross-faded (`amount` of the held one). */
  presentMixed(amount: number): void {
    this.mixInto(null, this.finished, this.held, amount);
  }

  /** The canvas's pixels, RGBA. */
  pixels(): Uint8Array<ArrayBuffer> {
    const { gl } = this;
    const out = new Uint8Array(this.canvas.width * this.canvas.height * 4);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.readPixels(0, 0, this.canvas.width, this.canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, out);
    return out;
  }

  /**
   * The mean luminance (0 to 1) of the canvas, and of each cell of a 6 × 4
   * grid: what the flash check reads.
   */
  luminance(): { mean: number; cells: Float32Array } {
    const pixels = this.pixels();
    const { width, height } = this.canvas;
    const cols = 6;
    const rows = 4;
    const cells = new Float32Array(cols * rows);
    const counts = new Float32Array(cols * rows);
    const step = 4;
    let sum = 0;
    let count = 0;
    for (let y = 0; y < height; y += step) {
      const row = Math.min(rows - 1, Math.floor((y / height) * rows));
      for (let x = 0; x < width; x += step) {
        const i = (y * width + x) * 4;
        const l = (0.2126 * pixels[i]! + 0.7152 * pixels[i + 1]! + 0.0722 * pixels[i + 2]!) / 255;
        const cell = row * cols + Math.min(cols - 1, Math.floor((x / width) * cols));
        cells[cell] = cells[cell]! + l;
        counts[cell] = counts[cell]! + 1;
        sum += l;
        count++;
      }
    }
    for (let i = 0; i < cells.length; i++) cells[i] = cells[i]! / Math.max(1, counts[i]!);
    return { mean: sum / Math.max(1, count), cells };
  }

  destroy(): void {
    this.gl.getExtension('WEBGL_lose_context')?.loseContext();
  }

  private drawScene(t: number, d: FrameDirection): void {
    const { gl } = this;
    const { program, uniforms: u } = this.scenePass;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.hdr.framebuffer);
    gl.viewport(0, 0, this.hdr.width, this.hdr.height);
    gl.disable(gl.BLEND);
    gl.useProgram(program);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.backdrop);
    gl.uniform1i(u.uBackdrop!, 0);
    gl.uniform2f(u.uResolution!, this.hdr.width, this.hdr.height);
    gl.uniform1f(u.uTime!, t);
    gl.uniform1i(u.uWorld!, this.look.index);
    gl.uniform4f(u.uCamera!, d.camera.x, d.camera.y, d.camera.zoom, d.camera.rotation);
    gl.uniform1f(u.uEnergy!, d.energy);
    gl.uniform1f(u.uSignature!, d.signature);
    gl.uniform1f(u.uLight!, d.light);
    gl.uniform3fv(u.uGasA!, this.look.gas[0]);
    gl.uniform3fv(u.uGasB!, this.look.gas[1]);
    gl.uniform3fv(u.uGlowA!, this.look.glow[0]);
    gl.uniform3fv(u.uGlowB!, this.look.glow[1]);
    gl.uniform2f(u.uSweep!, d.sweep, d.sweepStrength);
    gl.uniform1f(u.uSeed!, (this.options.seed % 97) * 0.37);
    const glows = new Float32Array(32);
    d.glows.forEach((g, i) => glows.set([g.x, g.y, g.strength, g.hue], i * 4));
    gl.uniform4fv(u['uGlows[0]']!, glows);
    gl.uniform1i(u.uGlowCount!, d.glows.length);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    // The particles, added over it.
    const p = this.particlePass;
    gl.useProgram(p.program);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.uniform2f(p.uniforms.uResolution!, this.hdr.width, this.hdr.height);
    gl.uniform1f(p.uniforms.uTime!, t);
    gl.uniform1i(p.uniforms.uWorld!, this.look.index);
    gl.uniform4f(p.uniforms.uCamera!, d.camera.x, d.camera.y, d.camera.zoom, d.camera.rotation);
    gl.uniform1f(p.uniforms.uFocus!, d.camera.focus);
    gl.uniform1f(p.uniforms.uEnergy!, d.energy * d.light);
    gl.uniform1f(p.uniforms.uSignature!, d.signature * d.light);
    gl.uniform3fv(p.uniforms.uGlowA!, this.look.glow[0]);
    gl.uniform3fv(p.uniforms.uGlowB!, this.look.glow[1]);
    gl.drawArrays(gl.POINTS, 0, this.particles);
    gl.disable(gl.BLEND);
  }

  private drawBloom(): void {
    const { gl } = this;
    const first = this.bloom[0]!;
    this.pass(this.brightPass, first, this.hdr, { uUp: 0 });
    for (let i = 1; i < this.bloom.length; i++) {
      this.pass(this.blurPass, this.bloom[i]!, this.bloom[i - 1]!, { uUp: 0 });
    }
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    for (let i = this.bloom.length - 1; i > 0; i--) {
      this.pass(this.blurPass, this.bloom[i - 1]!, this.bloom[i]!, { uUp: 1 });
    }
    gl.disable(gl.BLEND);
  }

  private drawFinish(t: number, d: FrameDirection, frame: number, into: Target): void {
    const { gl } = this;
    const { program, uniforms: u } = this.finishPass;
    gl.bindFramebuffer(gl.FRAMEBUFFER, into.framebuffer);
    gl.viewport(0, 0, into.width, into.height);
    gl.useProgram(program);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.hdr.texture);
    gl.uniform1i(u.uScene!, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.bloom[0]!.texture);
    gl.uniform1i(u.uBloom!, 1);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, this.caption);
    gl.uniform1i(u.uCaption!, 2);
    const captionAlpha = this.hasCaption
      ? Math.min(1, t / 1.5) * Math.min(1, Math.max(0, (10 - t) / 2))
      : 0;
    gl.uniform1f(u.uCaptionAlpha!, captionAlpha);
    const grades = KINDS.map((kind) => this.look.grades[kind]);
    gl.uniform3fv(
      u['uShadow[0]']!,
      grades.flatMap((g) => [...g.shadow]),
    );
    gl.uniform3fv(
      u['uHighlight[0]']!,
      grades.flatMap((g) => [...g.highlight]),
    );
    gl.uniform3fv(
      u['uLook[0]']!,
      grades.flatMap((g) => [g.exposure, g.saturation, g.contrast]),
    );
    gl.uniform3f(u.uWeights!, d.grade.calm, d.grade.bright, d.grade.deep);
    gl.uniform1f(u.uFrame!, frame % 997);
    gl.uniform1f(u.uBloomStrength!, 0.55 + 0.35 * d.signature);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  private mixInto(into: Target | null, a: Target, b: Target, amount: number): void {
    const { gl } = this;
    const { program, uniforms: u } = this.mixPass;
    gl.bindFramebuffer(gl.FRAMEBUFFER, into?.framebuffer ?? null);
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.useProgram(program);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, a.texture);
    gl.uniform1i(u.uA!, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, b.texture);
    gl.uniform1i(u.uB!, 1);
    gl.uniform1f(u.uMix!, amount);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  private pass(program: Program, into: Target, from: Target, values: Record<string, number>): void {
    const { gl } = this;
    gl.bindFramebuffer(gl.FRAMEBUFFER, into.framebuffer);
    gl.viewport(0, 0, into.width, into.height);
    gl.useProgram(program.program);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, from.texture);
    gl.uniform1i(program.uniforms.uSource!, 0);
    gl.uniform2f(program.uniforms.uTexel!, 1 / from.width, 1 / from.height);
    for (const [name, value] of Object.entries(values)) {
      const location = program.uniforms[name];
      if (location) gl.uniform1f(location, value);
    }
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  /** The game's painting of the world, a little larger than the frame, for the camera. */
  private paintBackdrop(): WebGLTexture {
    const { width, height, mood, palette } = this.options;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(width * 1.2);
    canvas.height = Math.round(height * 1.2);
    const ctx = canvas.getContext('2d')!;
    THEMES[mood.world]().paintBackground(ctx, canvas.width, canvas.height, palette);
    return this.texture(canvas);
  }

  /** The mood's name, in English, for its first ten seconds (when asked for). */
  private paintCaption(): WebGLTexture {
    const { width, height, mood } = this.options;
    const canvas = document.createElement('canvas');
    canvas.width = mood.caption ? width : 1;
    canvas.height = mood.caption ? height : 1;
    if (mood.caption) {
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.font = `600 ${Math.round(height * 0.05)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0,0,0,0.6)';
      ctx.shadowBlur = height * 0.02;
      ctx.fillText(mood.name.en, width / 2, height * 0.82);
    }
    return this.texture(canvas);
  }

  private texture(source: HTMLCanvasElement): WebGLTexture {
    const { gl } = this;
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return texture;
  }

  private target(width: number, height: number, float: boolean): Target {
    const { gl } = this;
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    if (float)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, width, height, 0, gl.RGBA, gl.HALF_FLOAT, null);
    else
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const framebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
      throw new Error('Incomplete render target');
    }
    return { framebuffer, texture, width, height };
  }

  private program(vertex: string, fragment: string): Program {
    const { gl } = this;
    const compile = (type: number, source: string) => {
      const shader = gl.createShader(type)!;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        throw new Error(gl.getShaderInfoLog(shader) ?? 'Shader did not compile');
      }
      return shader;
    };
    const program = gl.createProgram();
    gl.attachShader(program, compile(gl.VERTEX_SHADER, vertex));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragment));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(program) ?? 'Program did not link');
    }
    const uniforms: Uniforms = {};
    const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS) as number;
    for (let i = 0; i < count; i++) {
      const info = gl.getActiveUniform(program, i);
      if (info) uniforms[info.name] = gl.getUniformLocation(program, info.name);
    }
    return { program, uniforms };
  }
}
