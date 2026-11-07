/**
 * The shaders of the ambience scene (specification § 3.18, art direction).
 * Every effect is a function of time and of the uniforms the director sets:
 * no state, so any frame can be drawn on its own.
 */

/** A triangle covering the screen. */
export const FULLSCREEN_VERTEX = /* glsl */ `#version 300 es
out vec2 vUv;
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  vUv = p;
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

const NOISE = /* glsl */ `
float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash21(i), hash21(i + vec2(1, 0)), u.x),
             mix(hash21(i + vec2(0, 1)), hash21(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  mat2 r = mat2(0.8, -0.6, 0.6, 0.8);
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = r * p * 2.02 + 3.1;
    a *= 0.5;
  }
  return v;
}
// Domain-warped noise: the slow, ever-changing volutes of gas.
float volutes(vec2 p, float t) {
  vec2 q = vec2(fbm(p + vec2(0.0, t * 0.020)), fbm(p + vec2(5.2, 1.3) - t * 0.015));
  vec2 r = vec2(fbm(p + 3.5 * q + vec2(1.7, 9.2) + t * 0.012),
                fbm(p + 3.5 * q + vec2(8.3, 2.8) - t * 0.010));
  return fbm(p + 3.0 * r);
}
`;

/**
 * The scene: the world's painted backdrop under the camera, the living gas,
 * the light, the world's signature and the glows. Linear, unclamped colour
 * (HDR) into a floating-point target.
 */
export const SCENE_FRAGMENT = /* glsl */ `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColour;

uniform sampler2D uBackdrop;
uniform vec2 uResolution;
uniform float uTime;
uniform int uWorld;
uniform vec4 uCamera;      // x, y, zoom, rotation
uniform float uEnergy;
uniform float uSignature;
uniform float uLight;
uniform vec3 uGasA;
uniform vec3 uGasB;
uniform vec3 uGlowA;
uniform vec3 uGlowB;
uniform vec2 uSweep;       // position across, strength
uniform vec4 uGlows[8];    // x, y, strength, hue
uniform int uGlowCount;
uniform float uSeed;

${NOISE}

const float PI = 3.14159265;

vec2 cameraUv(vec2 uv, float depth) {
  float aspect = uResolution.x / uResolution.y;
  vec2 p = (uv - 0.5) * vec2(aspect, 1.0);
  float c = cos(uCamera.w * depth);
  float s = sin(uCamera.w * depth);
  p = mat2(c, -s, s, c) * p;
  p /= mix(1.0, uCamera.z, depth);
  p += uCamera.xy * depth;
  return p / vec2(aspect, 1.0) + 0.5;
}

// The far backdrop: the game's own painting, a little larger than the frame.
vec3 backdrop(vec2 uv) {
  vec2 b = cameraUv(uv, 0.6);
  b = (b - 0.5) / 1.1 + 0.5;
  return texture(uBackdrop, vec2(b.x, 1.0 - b.y)).rgb;
}

vec3 gas(vec2 uv, float t, float amount) {
  float aspect = uResolution.x / uResolution.y;
  vec2 p = cameraUv(uv, 0.8) * vec2(aspect, 1.0) * 2.2 + uSeed;
  float v = volutes(p, t);
  float w = volutes(p * 0.6 + 7.0, t * 0.7);
  vec3 c = mix(uGasA, uGasB, smoothstep(0.35, 0.75, w));
  return c * pow(smoothstep(0.30, 0.95, v), 1.6) * amount;
}

// Shafts of light from above, the particles in the gas catching them.
vec3 rays(vec2 uv, float t, vec3 colour, float amount) {
  vec2 p = cameraUv(uv, 0.7);
  float x = p.x + (1.0 - p.y) * 0.35;
  float shafts = 0.0;
  for (int i = 0; i < 5; i++) {
    float fi = float(i);
    float centre = fract(0.17 + fi * 0.23 + 0.02 * sin(t * 0.05 + fi));
    float width = 0.03 + 0.03 * noise(vec2(fi, t * 0.03));
    shafts += exp(-pow((x - centre) / width, 2.0)) * (0.5 + 0.5 * noise(vec2(fi * 3.1, t * 0.08)));
  }
  float fade = smoothstep(1.05, 0.0, p.y) ;
  return colour * shafts * (1.0 - fade * 0.0) * smoothstep(-0.1, 0.9, 1.0 - p.y) * amount;
}

// Nebula: a star being born, its halo and its four spikes.
vec3 starBirth(vec2 uv, float t, float s) {
  float aspect = uResolution.x / uResolution.y;
  vec2 p = (cameraUv(uv, 0.75) - vec2(0.58, 0.42)) * vec2(aspect, 1.0);
  float r = length(p);
  float core = exp(-r * r * 900.0) * 6.0;
  float halo = exp(-r * 6.0) * 0.9 + exp(-r * 18.0) * 1.2;
  float spikes = (exp(-abs(p.x) * 260.0) * exp(-abs(p.y) * 5.0)
                + exp(-abs(p.y) * 260.0) * exp(-abs(p.x) * 5.0)) * 1.4;
  float ring = exp(-pow((r - 0.08 - 0.10 * s) * 22.0, 2.0)) * fbm(p * 9.0 + t * 0.05) * 1.2;
  return (uGlowA * (core + spikes) + mix(uGlowA, uGlowB, 0.5) * halo + uGlowB * ring) * s;
}

// Neon: an endless grid to fly over, and auroras rippling above it.
vec3 neonWorld(vec2 uv, float t, float s) {
  vec2 p = cameraUv(uv, 0.9);
  vec3 c = vec3(0.0);
  float horizon = 0.58;
  if (p.y < horizon) {
    float d = horizon - p.y;
    float z = 0.12 / max(d, 0.002);
    float x = (p.x - 0.5) * z * 3.0;
    float lines = exp(-abs(fract(x) - 0.5) * 0.0 + 0.0) * 0.0;
    float gx = smoothstep(0.035 * z, 0.0, abs(fract(x + 0.5) - 0.5) );
    float gz = smoothstep(0.035 * z, 0.0, abs(fract(z - t * (0.25 + 0.35 * s)) - 0.5) - 0.0);
    float fog = exp(-z * 0.35);
    c += (uGlowA * gx + uGlowB * gz) * fog * (0.35 + 0.65 * uEnergy) + lines;
    c += uGlowB * exp(-d * 30.0) * 0.6;
  } else {
    float h = p.y - horizon;
    for (int i = 0; i < 3; i++) {
      float fi = float(i);
      float wave = 0.18 + 0.1 * fi + 0.06 * sin(p.x * (3.0 + fi) + t * (0.06 + 0.02 * fi))
                 + 0.05 * fbm(vec2(p.x * 2.0 + fi * 4.0, t * 0.04));
      float band = exp(-pow((h - wave) * 14.0, 2.0)) * smoothstep(0.0, 0.08, h);
      float curtain = band * (0.6 + 0.4 * noise(vec2(p.x * 25.0, t * 0.2 + fi)));
      c += mix(uGlowA, uGlowB, fi * 0.5) * curtain * (0.35 + 0.9 * s);
    }
  }
  return c;
}

// Abyss: jellyfish of light drifting up, trailing their tentacles.
vec3 jellyfish(vec2 uv, float t, float s) {
  float aspect = uResolution.x / uResolution.y;
  vec3 c = vec3(0.0);
  for (int i = 0; i < 6; i++) {
    float fi = float(i);
    float depth = 0.45 + 0.12 * fi;
    vec2 base = vec2(fract(0.13 + fi * 0.37 + 0.01 * sin(t * 0.07 + fi)),
                     -0.35 + fract(fi * 0.29 + t * (0.006 + 0.002 * fi)) * 1.7);
    vec2 p = (cameraUv(uv, depth) - base) * vec2(aspect, 1.0);
    float size = 0.05 + 0.03 * fract(fi * 0.73);
    float pulse = 1.0 + 0.08 * sin(t * 0.9 + fi * 2.0);
    vec2 q = p / (size * vec2(pulse, 1.0 / pulse));
    // The bell: a dome, its lower edge scalloped, brighter at its rim, veiled inside.
    vec2 b = q * vec2(1.0, 1.3);
    float r = length(b);
    float hem = -0.18 + 0.07 * cos(q.x * 9.0 + t * 1.3 + fi);
    float inside = smoothstep(1.0, 0.92, r) * smoothstep(hem - 0.06, hem + 0.06, q.y);
    float bell = inside * (0.22 + 0.12 * sin(r * 13.0 - t * 0.8));
    float rim = exp(-pow((r - 0.93) * 9.0, 2.0)) * smoothstep(hem - 0.06, hem + 0.1, q.y)
              + exp(-pow((q.y - hem) * 16.0, 2.0)) * smoothstep(1.05, 0.7, abs(q.x)) * 0.6;
    float tentacles = 0.0;
    for (int k = 0; k < 4; k++) {
      float fk = float(k);
      float x0 = -0.6 + 0.4 * fk;
      float y = hem - q.y;
      float wave = x0 + 0.18 * sin(y * 2.2 - t * 1.1 + fk + fi) * min(y, 3.0) * 0.4;
      tentacles += exp(-pow((q.x - wave) * 14.0, 2.0)) * smoothstep(0.0, 0.2, y) * smoothstep(4.0, 0.5, y);
    }
    float glow = exp(-length(q) * 1.6) * 0.5;
    vec3 tint = mix(uGlowA, uGlowB, fract(fi * 0.5));
    c += tint * (bell + rim * 1.2 + tentacles * 0.45 + glow) * (0.65 + 0.6 * s) * (0.5 + depth);
  }
  return c;
}

// Jewels: great crystals turning slowly, their faces splitting the light into rainbows.
vec3 hue(float h) {
  return clamp(abs(fract(h + vec3(0.0, 2.0 / 3.0, 1.0 / 3.0)) * 6.0 - 3.0) - 1.0, 0.0, 1.0);
}
vec3 crystals(vec2 uv, float t, float s) {
  float aspect = uResolution.x / uResolution.y;
  vec3 c = vec3(0.0);
  for (int i = 0; i < 4; i++) {
    float fi = float(i);
    vec2 centre = vec2(0.2 + 0.2 * fi + 0.03 * sin(t * 0.03 + fi), 0.35 + 0.25 * fract(fi * 0.61));
    vec2 p = (cameraUv(uv, 0.5 + 0.12 * fi) - centre) * vec2(aspect, 1.0);
    float angle = t * (0.02 + 0.01 * fi) * (mod(fi, 2.0) * 2.0 - 1.0) + fi;
    float ca = cos(angle);
    float sa = sin(angle);
    p = mat2(ca, -sa, sa, ca) * p;
    float size = 0.07 + 0.03 * fi;
    // A hexagonal prism: its outline and its facets.
    vec2 a = abs(p);
    float hex = max(a.x * 0.866 + a.y * 0.5, a.y) - size;
    float face = floor((atan(p.y, p.x) + PI) / (PI / 3.0));
    float inside = smoothstep(0.004, -0.004, hex);
    float edge = exp(-abs(hex) * 160.0);
    vec3 facet = hue(face / 6.0 + t * 0.01 + s * 0.2) * (0.25 + 0.2 * sin(face + t * 0.2));
    c += (facet * inside * 1.2 + edge * mix(uGlowA, vec3(1.0), 0.5) * 1.6) * (0.6 + 0.6 * s);
  }
  // Rainbow caustics sweeping slowly across the picture at the peak.
  vec2 p = cameraUv(uv, 0.6);
  float bands = sin((p.x + p.y * 0.4) * 9.0 - t * 0.12);
  c += hue(p.x * 0.8 + t * 0.01) * smoothstep(0.7, 1.0, bands) * 0.35 * s;
  return c;
}

// Volcano: rivers of lava far below and the glow of the horizon.
vec3 lava(vec2 uv, float t, float s) {
  vec2 p = cameraUv(uv, 0.8);
  float low = smoothstep(0.55, 1.0, p.y);
  vec2 q = vec2(p.x * 3.0, p.y * 9.0);
  float flow = volutes(q + vec2(t * 0.02, 0.0), t * 0.5);
  float rivers = pow(smoothstep(0.55, 0.85, flow), 2.0) * low;
  float horizon = exp(-pow((p.y - 0.62) * 9.0, 2.0)) * (0.4 + 0.9 * s);
  return uGlowA * rivers * 2.4 + mix(uGlowA, uGlowB, 0.4) * horizon;
}

// Singularity: a black hole far away, its disk of light bending the stars behind it.
vec2 lens(vec2 uv) {
  float aspect = uResolution.x / uResolution.y;
  vec2 centre = vec2(0.62, 0.45);
  vec2 d = (uv - centre) * vec2(aspect, 1.0);
  float r = max(length(d), 0.001);
  return uv - normalize(d) / vec2(aspect, 1.0) * 0.0035 / r;
}
vec3 blackHole(vec2 uv, float t, float s) {
  float aspect = uResolution.x / uResolution.y;
  vec2 p = (cameraUv(uv, 0.7) - vec2(0.62, 0.45)) * vec2(aspect, 1.0);
  float tilt = 0.28;
  vec2 q = vec2(p.x, p.y / tilt);
  float r = length(q);
  float disk = smoothstep(0.06, 0.09, r) * smoothstep(0.30, 0.12, r);
  float swirl = 0.6 + 0.4 * fbm(vec2(atan(q.y, q.x) * 3.0 - t * 0.25, r * 18.0));
  float doppler = 0.55 + 0.45 * (q.x / max(r, 0.001));
  float ring = exp(-pow((length(p) - 0.055) * 120.0, 2.0)) * (1.0 + 2.0 * s);
  float shadow = smoothstep(0.05, 0.035, length(p));
  vec3 c = mix(uGlowB, uGlowA, doppler) * disk * swirl * doppler * (1.2 + 1.4 * s) + uGlowA * ring;
  return c * (1.0 - shadow);
}

void main() {
  vec2 uv = vUv;
  float t = uTime;
  vec2 bgUv = uWorld == 5 ? lens(uv) : uv;
  vec3 c = backdrop(bgUv) * (0.55 + 0.45 * uLight);
  float energy = uEnergy;
  float s = uSignature;
  c += gas(uv, t, (0.35 + 0.4 * energy + 0.4 * s) * uLight);
  if (uWorld == 0) {
    c += rays(uv, t, mix(uGlowA, uGlowB, 0.5), 0.12 * uLight);
    c += starBirth(uv, t, 0.25 + s);
  } else if (uWorld == 1) {
    c += neonWorld(uv, t, s) * uLight;
  } else if (uWorld == 2) {
    c += rays(uv, t, uGlowA, (0.22 + 0.25 * s) * uLight);
    c += jellyfish(uv, t, s) * uLight;
  } else if (uWorld == 3) {
    c += crystals(uv, t, s) * uLight;
  } else if (uWorld == 4) {
    c += lava(uv, t, s) * uLight;
  } else {
    c += blackHole(uv, t, s) * uLight;
  }
  // The glows of the glass and bell notes.
  float aspect = uResolution.x / uResolution.y;
  for (int i = 0; i < 8; i++) {
    if (i >= uGlowCount) break;
    vec4 g = uGlows[i];
    vec2 d = (cameraUv(uv, 0.85) - g.xy) * vec2(aspect, 1.0);
    float r2 = dot(d, d);
    c += mix(uGlowA, uGlowB, g.w) * g.z * (exp(-r2 * 120.0) * 0.6 + exp(-r2 * 18.0) * 0.15);
  }
  // A band of light crossing the picture while one shot gives way to the next.
  float across = uv.x * 0.8 + (1.0 - uv.y) * 0.2;
  c += mix(uGlowA, uGlowB, 0.5) * exp(-pow((across - (uSweep.x * 1.4 - 0.2)) * 4.0, 2.0)) * uSweep.y;
  outColour = vec4(c, 1.0);
}`;

/**
 * The particles: five depths, the far ones small and sharp, the near ones
 * large and soft (out of focus), each moving as its world wants: drifting
 * stars, scanning sparks, rising plankton, glints, rising embers.
 */
export const PARTICLE_VERTEX = /* glsl */ `#version 300 es
precision highp float;
uniform vec2 uResolution;
uniform float uTime;
uniform int uWorld;
uniform vec4 uCamera;
uniform float uFocus;
uniform float uEnergy;
uniform float uSignature;
uniform float uCount;
out float vSoft;
out float vLight;
out float vHue;

float h(float n, float s) { return fract(sin(n * 127.1 + s * 311.7) * 43758.5453); }

void main() {
  float id = float(gl_VertexID);
  float depth = floor(h(id, 1.0) * 5.0) / 4.0;          // 0 far .. 1 near
  vec2 seed = vec2(h(id, 2.0), h(id, 3.0));
  float speed = (0.15 + 0.85 * h(id, 4.0)) * (0.3 + depth);
  vec2 velocity;
  if (uWorld == 2) velocity = vec2(0.002 * sin(uTime * 0.2 + id), -0.008);       // plankton rises
  else if (uWorld == 4) velocity = vec2(0.004 * sin(uTime * 0.3 + id), -0.012);  // embers rise
  else if (uWorld == 1) velocity = vec2(0.01, 0.0);                              // sparks scan
  else if (uWorld == 3) velocity = vec2(0.0015, -0.001);                        // glints hang
  else velocity = vec2(0.004, 0.0012);                                          // stars drift
  vec2 p = fract(seed + velocity * speed * uTime + 0.03 * vec2(sin(uTime * 0.05 + id), cos(uTime * 0.04 + id * 1.3)));
  // Parallax: the near particles move most with the camera.
  float aspect = uResolution.x / uResolution.y;
  vec2 q = (p - 0.5) * vec2(aspect, 1.0);
  float c = cos(uCamera.w * (0.6 + depth));
  float s = sin(uCamera.w * (0.6 + depth));
  q = mat2(c, -s, s, c) * q;
  q /= mix(1.0, uCamera.z, 0.6 + depth);
  q += uCamera.xy * (0.6 + depth * 1.2);
  q /= vec2(aspect, 1.0);
  gl_Position = vec4(q * 2.0, 0.0, 1.0);
  float blur = abs(depth - uFocus);
  float scale = uResolution.y / 1080.0;
  gl_PointSize = clamp((2.0 + depth * depth * 26.0) * (1.0 + blur * 2.5) * scale, 1.0, 96.0);
  vSoft = blur;
  float twinkle = 0.55 + 0.45 * sin(uTime * (0.4 + h(id, 5.0)) + id);
  vLight = twinkle * (0.25 + 0.5 * uEnergy + 0.6 * uSignature) / (1.0 + blur * blur * 6.0) * (0.5 + 0.5 * h(id, 6.0));
  vHue = h(id, 7.0);
}`;

export const PARTICLE_FRAGMENT = /* glsl */ `#version 300 es
precision highp float;
in float vSoft;
in float vLight;
in float vHue;
uniform vec3 uGlowA;
uniform vec3 uGlowB;
out vec4 outColour;
void main() {
  vec2 d = gl_PointCoord - 0.5;
  float r = length(d) * 2.0;
  float edge = mix(0.15, 0.95, clamp(vSoft * 1.5, 0.0, 1.0));
  float disc = smoothstep(1.0, 1.0 - edge, r);
  // Out of focus: a ring of light, as a lens draws it.
  float bokeh = mix(1.0, 0.65 + 0.35 * smoothstep(0.5, 0.95, r), clamp(vSoft * 2.0, 0.0, 1.0));
  vec3 colour = mix(uGlowA, uGlowB, step(0.6, vHue)) * 0.7 + 0.3;
  outColour = vec4(colour * disc * bokeh * vLight, 1.0);
}`;

/** Bright parts, halved: the start of the halo (bloom). */
export const BRIGHT_FRAGMENT = /* glsl */ `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uSource;
uniform vec2 uTexel;
out vec4 outColour;
void main() {
  vec3 c = vec3(0.0);
  c += texture(uSource, vUv + uTexel * vec2(-1, -1)).rgb;
  c += texture(uSource, vUv + uTexel * vec2(1, -1)).rgb;
  c += texture(uSource, vUv + uTexel * vec2(-1, 1)).rgb;
  c += texture(uSource, vUv + uTexel * vec2(1, 1)).rgb;
  c *= 0.25;
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  outColour = vec4(c * smoothstep(0.35, 1.2, l), 1.0);
}`;

/** One step of the dual-filter blur, down (`uUp` 0) or up (1). */
export const BLUR_FRAGMENT = /* glsl */ `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uSource;
uniform vec2 uTexel;
uniform float uUp;
out vec4 outColour;
void main() {
  vec2 o = uTexel * (uUp > 0.5 ? 1.0 : 0.5);
  vec3 c;
  if (uUp < 0.5) {
    c = texture(uSource, vUv).rgb * 4.0;
    c += texture(uSource, vUv - o).rgb;
    c += texture(uSource, vUv + o).rgb;
    c += texture(uSource, vUv + vec2(o.x, -o.y)).rgb;
    c += texture(uSource, vUv - vec2(o.x, -o.y)).rgb;
    c /= 8.0;
  } else {
    c = texture(uSource, vUv + vec2(-o.x * 2.0, 0.0)).rgb;
    c += texture(uSource, vUv + vec2(-o.x, o.y)).rgb * 2.0;
    c += texture(uSource, vUv + vec2(0.0, o.y * 2.0)).rgb;
    c += texture(uSource, vUv + vec2(o.x, o.y)).rgb * 2.0;
    c += texture(uSource, vUv + vec2(o.x * 2.0, 0.0)).rgb;
    c += texture(uSource, vUv + vec2(o.x, -o.y)).rgb * 2.0;
    c += texture(uSource, vUv + vec2(0.0, -o.y * 2.0)).rgb;
    c += texture(uSource, vUv + vec2(-o.x, -o.y)).rgb * 2.0;
    c /= 12.0;
  }
  outColour = vec4(c, 1.0);
}`;

/**
 * The finish: scene and halo, the colour grade (three looks per world,
 * mixed), filmic tone mapping, vignette and a fine grain, which also keeps
 * H.264 from banding the dark gradients.
 */
export const FINISH_FRAGMENT = /* glsl */ `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uScene;
uniform sampler2D uBloom;
uniform sampler2D uCaption;
uniform float uCaptionAlpha;
uniform vec3 uShadow[3];
uniform vec3 uHighlight[3];
uniform vec3 uLook[3];     // exposure, saturation, contrast
uniform vec3 uWeights;     // calm, bright, deep
uniform float uFrame;
uniform float uBloomStrength;
out vec4 outColour;

float grain(vec2 p, float f) {
  p = fract(p * vec2(0.1031, 0.1030) + f * 0.618);
  p += dot(p, p.yx + 33.33);
  return fract((p.x + p.y) * p.x) - 0.5;
}
vec3 aces(vec3 x) {
  return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
}
void main() {
  vec3 c = texture(uScene, vUv).rgb + texture(uBloom, vUv).rgb * uBloomStrength;
  vec3 w = uWeights / max(1e-4, dot(uWeights, vec3(1.0)));
  vec3 shadow = uShadow[0] * w.x + uShadow[1] * w.y + uShadow[2] * w.z;
  vec3 highlight = uHighlight[0] * w.x + uHighlight[1] * w.y + uHighlight[2] * w.z;
  vec3 look = uLook[0] * w.x + uLook[1] * w.y + uLook[2] * w.z;
  c *= look.x;
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  c = mix(vec3(l), c, look.y);
  vec3 tone = mix(shadow, highlight, smoothstep(0.0, 0.9, l));
  c *= tone * 1.25;
  c = aces(c);
  c = mix(vec3(0.5), c, look.z) ;
  vec2 v = vUv - 0.5;
  c *= 1.0 - dot(v, v) * 0.9;
  c = clamp(c, 0.0, 1.0);
  c = pow(c, vec3(1.0 / 2.2));
  vec4 caption = texture(uCaption, vec2(vUv.x, 1.0 - vUv.y));
  c = mix(c, caption.rgb, caption.a * uCaptionAlpha);
  c += grain(gl_FragCoord.xy, uFrame) * (3.0 / 255.0);
  outColour = vec4(c, 1.0);
}`;

/** Two finished frames cross-faded: the seam of a looping Short. */
export const MIX_FRAGMENT = /* glsl */ `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uA;
uniform sampler2D uB;
uniform float uMix;
out vec4 outColour;
void main() {
  outColour = vec4(mix(texture(uA, vUv).rgb, texture(uB, vUv).rgb, uMix), 1.0);
}`;
