import type { SpriteCanvas } from '../canvas';

/** A shock wave in device pixels of the canvas (y downwards). */
export interface PixelWave {
  readonly x: number;
  readonly y: number;
  readonly radius: number;
  readonly strength: number;
}

export const MAX_WAVES = 8;

const VERTEX = `#version 300 es
out vec2 v_uv;
void main() {
  // One triangle covering the screen.
  vec2 corner = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  v_uv = corner;
  gl_Position = vec4(corner * 2.0 - 1.0, 0.0, 1.0);
}`;

const FRAGMENT = `#version 300 es
precision highp float;
uniform sampler2D u_scene;
uniform vec2 u_size;
uniform vec4 u_waves[${MAX_WAVES}];
uniform int u_count;
uniform float u_width;
in vec2 v_uv;
out vec4 colour;
void main() {
  vec2 p = v_uv * u_size;
  vec2 offset = vec2(0.0);
  for (int i = 0; i < ${MAX_WAVES}; i++) {
    if (i >= u_count) break;
    vec4 w = u_waves[i];
    vec2 d = p - w.xy;
    float dist = length(d);
    float band = (dist - w.z) / u_width;
    float push = exp(-band * band) * w.w;
    if (dist > 0.001) offset += d / dist * push;
  }
  vec2 uv = (p - offset) / u_size;
  // Chromatic aberration where the picture bends.
  vec2 split = offset / u_size * 0.2;
  colour = vec4(
    texture(u_scene, uv + split).r,
    texture(u_scene, uv).g,
    texture(u_scene, uv - split).b,
    1.0
  );
}`;

/**
 * Shock waves that bend the picture (specification § 3.5), in WebGL2. It is a
 * second canvas laid over the board: while waves run it shows a distorted copy
 * of the board canvas, otherwise it is hidden and costs nothing. Without
 * WebGL2, `create` returns null and the game simply has no distortion.
 */
export class DistortionLayer {
  private readonly uniforms: {
    size: WebGLUniformLocation | null;
    waves: WebGLUniformLocation | null;
    count: WebGLUniformLocation | null;
    width: WebGLUniformLocation | null;
  };
  private readonly data = new Float32Array(MAX_WAVES * 4);
  private visible = false;
  private lost = false;

  private constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly gl: WebGL2RenderingContext,
    program: WebGLProgram,
  ) {
    gl.useProgram(program);
    this.uniforms = {
      size: gl.getUniformLocation(program, 'u_size'),
      waves: gl.getUniformLocation(program, 'u_waves'),
      count: gl.getUniformLocation(program, 'u_count'),
      width: gl.getUniformLocation(program, 'u_width'),
    };
    const texture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.uniform1i(gl.getUniformLocation(program, 'u_scene'), 0);
    canvas.addEventListener('webglcontextlost', (event) => {
      event.preventDefault();
      this.lost = true;
      this.hide();
    });
    this.hide();
  }

  static create(canvas: HTMLCanvasElement): DistortionLayer | null {
    const gl = canvas.getContext('webgl2', { alpha: false, antialias: false, depth: false });
    if (!gl) return null;
    const program = DistortionLayer.compile(gl);
    return program ? new DistortionLayer(canvas, gl, program) : null;
  }

  /** Its drawing buffer follows the board's canvas; set again only when that size changes. */
  resize(width: number, height: number): void {
    if (this.canvas.width !== width) this.canvas.width = width;
    if (this.canvas.height !== height) this.canvas.height = height;
  }

  /** Draws the distorted board, or hides the layer when there is no wave. */
  present(source: SpriteCanvas, waves: readonly PixelWave[], bandWidth: number): void {
    if (this.lost || waves.length === 0) {
      this.hide();
      return;
    }
    const { gl } = this;
    const count = Math.min(MAX_WAVES, waves.length);
    for (let i = 0; i < count; i++) {
      const wave = waves[i]!;
      // WebGL counts y from the bottom.
      this.data.set([wave.x, this.canvas.height - wave.y, wave.radius, wave.strength], i * 4);
    }
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    gl.uniform2f(this.uniforms.size, this.canvas.width, this.canvas.height);
    gl.uniform4fv(this.uniforms.waves, this.data);
    gl.uniform1i(this.uniforms.count, count);
    gl.uniform1f(this.uniforms.width, bandWidth);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (!this.visible) {
      this.canvas.hidden = false;
      this.visible = true;
    }
  }

  hide(): void {
    if (this.visible || !this.canvas.hidden) this.canvas.hidden = true;
    this.visible = false;
  }

  private static compile(gl: WebGL2RenderingContext): WebGLProgram | null {
    const shader = (type: number, source: string) => {
      const result = gl.createShader(type);
      if (!result) return null;
      gl.shaderSource(result, source);
      gl.compileShader(result);
      return gl.getShaderParameter(result, gl.COMPILE_STATUS) ? result : null;
    };
    const vertex = shader(gl.VERTEX_SHADER, VERTEX);
    const fragment = shader(gl.FRAGMENT_SHADER, FRAGMENT);
    const program = gl.createProgram();
    if (!vertex || !fragment) return null;
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    return gl.getProgramParameter(program, gl.LINK_STATUS) ? program : null;
  }
}
