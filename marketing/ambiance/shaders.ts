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
// The currents: a slowly turning, divergence-free field (the curl of a moving noise).
// Everything that drifts follows it, so the whole picture sways as one body of water.
float flowNoise(vec2 p, float t) {
  return noise(p + vec2(t * 0.05, -t * 0.03)) * 0.6
       + noise(p * 2.1 + vec2(-t * 0.04, t * 0.06)) * 0.3
       + noise(p * 4.3 + vec2(t * 0.07, t * 0.02)) * 0.1;
}
vec2 currentAt(vec2 p, float t) {
  const float e = 0.05;
  float dx = flowNoise(p + vec2(e, 0.0), t) - flowNoise(p - vec2(e, 0.0), t);
  float dy = flowNoise(p + vec2(0.0, e), t) - flowNoise(p - vec2(0.0, e), t);
  return vec2(dy, -dx) / (2.0 * e);
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
  return colour * shafts * smoothstep(-0.1, 0.9, p.y) * amount;
}

// Nebula: a star being born, its halo and its four spikes.
vec3 starBirth(vec2 uv, float t, float s) {
  float aspect = uResolution.x / uResolution.y;
  vec2 p = (cameraUv(uv, 0.75) - vec2(0.58, 0.42)) * vec2(aspect, 1.0);
  float r = length(p);
  float core = exp(-r * r * 1400.0) * 3.0;
  float halo = exp(-r * 7.0) * 0.55 + exp(-r * 22.0) * 0.8;
  float spikes = (exp(-abs(p.x) * 260.0) * exp(-abs(p.y) * 5.0)
                + exp(-abs(p.y) * 260.0) * exp(-abs(p.x) * 5.0)) * 1.4;
  float ring = exp(-pow((r - 0.08 - 0.10 * s) * 22.0, 2.0)) * fbm(p * 9.0 + t * 0.05) * 1.2;
  return (uGlowA * (core + spikes) + mix(uGlowA, uGlowB, 0.5) * halo + uGlowB * ring) * s;
}

// Neon: an endless grid to fly over, and auroras rippling above it.
vec3 neonWorld(vec2 uv, float t, float s) {
  vec2 p = cameraUv(uv, 0.9);
  vec3 c = vec3(0.0);
  float horizon = 0.46;
  if (p.y < horizon) {
    float d = horizon - p.y;
    float z = 0.25 / max(d, 0.004);
    float x = (p.x - 0.5) * z * 4.0;
    float travel = z - t * (0.35 + 0.35 * s);
    float gx = 1.0 - smoothstep(0.0, fwidth(x) * 1.5, abs(fract(x + 0.5) - 0.5));
    float gz = 1.0 - smoothstep(0.0, fwidth(travel) * 1.5, abs(fract(travel + 0.5) - 0.5));
    float fog = exp(-z * 0.12);
    c += (uGlowA * gx + uGlowB * gz) * fog * (0.5 + 0.5 * uEnergy);
    c += uGlowB * exp(-d * 22.0) * 0.45;
  } else {
    float h = p.y - horizon;
    c += uGlowB * exp(-h * 18.0) * 0.35;
    for (int i = 0; i < 3; i++) {
      float fi = float(i);
      float wave = 0.16 + 0.09 * fi + 0.05 * sin(p.x * (3.0 + fi) + t * (0.05 + 0.02 * fi))
                 + 0.04 * fbm(vec2(p.x * 2.0 + fi * 4.0, t * 0.04));
      float band = exp(-pow((h - wave) * 22.0, 2.0)) * smoothstep(0.0, 0.08, h);
      float curtain = band * (0.5 + 0.5 * noise(vec2(p.x * 30.0, t * 0.15 + fi)));
      c += mix(uGlowA, uGlowB, fi * 0.5) * curtain * (0.2 + 0.45 * s);
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
    // Each pass up the screen is a new jellyfish: it changes out of sight, below the frame.
    float climb = fi * 0.29 + t * (0.006 + 0.002 * fi);
    float pass = floor(climb) + fi * 17.0;
    float r1 = hash21(vec2(pass, 1.3));
    float r2 = hash21(vec2(pass, 2.7));
    float r3 = hash21(vec2(pass, 4.1));
    vec2 base = vec2(0.08 + 0.84 * r1 + 0.03 * sin(t * 0.05 + fi), -0.35 + fract(climb) * 1.7);
    base += currentAt(base * 1.5, t) * 0.02;
    vec2 p = (cameraUv(uv, depth) - base) * vec2(aspect, 1.0);
    float size = 0.035 + 0.05 * r2;
    float pulse = 1.0 + 0.08 * sin(t * (0.6 + 0.6 * r3) + fi * 2.0);
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
    float glow = exp(-length(q) * 1.8) * 0.35;
    vec3 tint = mix(uGlowA, uGlowB, r3);
    c += tint * (bell + rim * 0.9 + tentacles * 0.4 + glow) * (0.6 + 0.45 * s) * (0.5 + depth);
  }
  return c;
}

// Abyss: filaments of light carried by the currents, appearing and fading as they flow.
vec3 currents(vec2 uv, float t, float amount) {
  float aspect = uResolution.x / uResolution.y;
  vec2 p = cameraUv(uv, 0.65) * vec2(aspect, 1.0);
  vec2 w = p + 0.35 * currentAt(p * 0.9, t * 0.6);
  float lanes = 0.0;
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    float y = w.y * (4.0 + fi * 2.0) + fbm(vec2(w.x * 0.6 + t * 0.02 * (1.0 + fi), fi * 3.1)) * 2.5
            - t * (0.04 + 0.015 * fi);
    float line = pow(1.0 - abs(fract(y) - 0.5) * 2.0, 14.0);
    float mask = smoothstep(0.5, 0.78, noise(vec2(w.x * 1.2 - t * 0.025 * (1.0 + fi), w.y * 1.6 + fi * 7.0)));
    lanes += line * mask * (0.5 - 0.12 * fi);
  }
  return mix(uGlowA, uGlowB, 0.3) * lanes * amount;
}

// Abyss: great rays gliding far away, rarely and never twice the same way. Dark shapes
// rimmed with light; returns the colour and how much of the picture it covers.
vec4 mantas(vec2 uv, float t) {
  float aspect = uResolution.x / uResolution.y;
  vec4 out4 = vec4(0.0);
  for (int i = 0; i < 2; i++) {
    float fi = float(i);
    float period = 300.0 + 110.0 * fi;
    float journey = t / period + fi * 0.43;
    float pass = floor(journey) + fi * 31.0;
    if (hash21(vec2(pass, 5.0)) > 0.55) continue;          // many passes stay empty: an event
    float u = fract(journey);
    float dir = hash21(vec2(pass, 6.0)) < 0.5 ? 1.0 : -1.0;
    // It rises slowly towards the light, slanting across: its wings spread wide to the sides.
    float x0 = 0.2 + 0.6 * hash21(vec2(pass, 7.0));
    vec2 centre = vec2(x0 + dir * (u - 0.5) * 0.7 + 0.03 * sin(u * 7.0 + pass), mix(-0.35, 1.35, u));
    float span = 0.09 + 0.06 * hash21(vec2(pass, 8.0));
    vec2 p = (cameraUv(uv, 0.45) - centre) * vec2(aspect, 1.0);
    float bank = 0.15 * cos(u * 7.0 + pass);
    vec2 heading = normalize(vec2(dir * 0.42 + bank, 1.0));
    // Its own frame: x forward, y across the wings, in wingspans.
    vec2 l = vec2(dot(p, heading), dot(p, vec2(-heading.y, heading.x))) / span;
    float flap = t * (0.45 + 0.2 * hash21(vec2(pass, 9.0))) + pass;
    // The wings beat slowly: they seem to shorten and their tips curl.
    float side = abs(l.y) / (0.85 + 0.15 * cos(flap));
    float f = l.x + 0.07 * sin(flap - side * 1.8) * side * side;
    // Seen from below: broad at the body, a rounded leading edge, a hollowed trailing edge.
    float front = 0.45 - 0.5 * pow(side, 1.4);
    float rear = -0.4 + 0.3 * pow(side, 0.8);
    float soft = 0.05;
    float wing = smoothstep(1.0, 0.9, side) * smoothstep(rear - soft, rear + soft, f)
               * smoothstep(front + soft, front - soft, f);
    // The two horns at the front, and the long thin tail.
    float horns = smoothstep(0.05, 0.02, abs(abs(l.y) - 0.12)) * smoothstep(0.62, 0.48, f) * step(0.35, f);
    float tail = smoothstep(0.02, 0.007, abs(l.y)) * smoothstep(-1.25, -0.5, f) * step(f, -0.35);
    float body = max(max(wing, horns), tail * 0.7);
    float edge = min(min(front - f, f - rear), (1.0 - side) * 0.6);
    float rim = wing * (1.0 - smoothstep(0.0, 0.1, edge));
    // A paler belly towards the middle: a body, not a cut-out.
    float belly = wing * smoothstep(0.7, 0.0, side) * smoothstep(-0.3, 0.2, f);
    vec3 colour = uGasA * (0.14 + 0.22 * belly) + uGlowB * rim * 0.3;
    float cover = body * 0.6;
    out4.rgb = mix(out4.rgb, colour, cover);
    out4.a = max(out4.a, cover);
  }
  return out4;
}

// Jewels: great crystals turning slowly, their faces splitting the light into rainbows.
vec3 hue(float h) {
  return clamp(abs(fract(h + vec3(0.0, 2.0 / 3.0, 1.0 / 3.0)) * 6.0 - 3.0) - 1.0, 0.0, 1.0);
}
vec3 crystals(vec2 uv, float t, float s) {
  float aspect = uResolution.x / uResolution.y;
  vec3 c = vec3(0.0);
  for (int i = 0; i < 5; i++) {
    float fi = float(i);
    vec2 centre = vec2(0.12 + 0.19 * fi + 0.02 * sin(t * 0.03 + fi), 0.3 + 0.35 * fract(fi * 0.61));
    float depth = 0.45 + 0.1 * fi;
    vec2 p = (cameraUv(uv, depth) - centre) * vec2(aspect, 1.0);
    float angle = 0.25 * sin(t * (0.02 + 0.006 * fi) + fi * 1.7);
    float ca = cos(angle);
    float sa = sin(angle);
    p = mat2(ca, -sa, sa, ca) * p;
    float size = 0.035 + 0.02 * fract(fi * 0.53);
    // A long crystal with pointed ends, three faces turned to us.
    vec2 a = abs(p / vec2(1.0, 2.6));
    float body = max(a.x * 0.866 + a.y * 0.5, a.x) - size;
    float inside = smoothstep(0.003, -0.003, body);
    float across = p.x / size;
    // The faces turn with time: their light slides across them.
    float turn = t * (0.03 + 0.01 * fi) + fi;
    float face = across + 0.6 * sin(turn);
    float shade = face < -0.35 ? 0.3 : face > 0.35 ? 0.18 : 0.55;
    float streak = 0.5 + 0.5 * sin(p.y / size * 1.4 + turn * 2.0);
    vec3 body3 = mix(uGlowB, uGlowA, streak) * shade;
    vec3 rainbow = hue(p.y / size * 0.12 + face * 0.15 + t * 0.008) * (0.15 + 0.4 * s) * streak;
    float edge = exp(-abs(body) * 420.0) * 0.45;
    float sparkle = pow(max(0.0, sin(turn * 3.0 + fi * 5.0)), 40.0) * exp(-dot(p, p) * 900.0) * 3.0;
    c += ((body3 + rainbow) * inside * 0.8 + mix(uGlowA, vec3(1.0), 0.5) * (edge + sparkle)) * (0.6 + 0.5 * s) * (0.5 + depth);
  }
  // Rainbow caustics sweeping slowly across the picture at the peak.
  vec2 p = cameraUv(uv, 0.6);
  float bands = sin((p.x + p.y * 0.4) * 9.0 - t * 0.12);
  c += hue(p.x * 0.8 + t * 0.01) * smoothstep(0.75, 1.0, bands) * 0.22 * s;
  return c;
}

// Volcano: rivers of lava far below and the glow of the horizon.
vec3 lava(vec2 uv, float t, float s) {
  vec2 p = cameraUv(uv, 0.8);
  float horizonY = 0.42;
  float below = smoothstep(horizonY, horizonY - 0.08, p.y);
  // Seen in perspective: the rivers stretch towards the horizon.
  float d = max(horizonY - p.y, 0.01);
  vec2 q = vec2((p.x - 0.5) / d * 0.6, 1.0 / d * 0.35);
  float flow = volutes(q * 0.8 + vec2(0.0, -t * 0.03), t * 0.4);
  float rivers = pow(smoothstep(0.55, 0.8, flow), 2.0) * below * exp(-0.6 / d * 0.1);
  float horizon = exp(-pow((p.y - horizonY) * 16.0, 2.0)) * (0.22 + 0.4 * s);
  float sky = smoothstep(horizonY, horizonY + 0.4, p.y);
  return uGlowA * rivers * 1.6 + mix(uGlowA, uGlowB, 0.4) * horizon + uGlowA * 0.06 * (1.0 - sky) * (1.0 - below);
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
  float tilt = 0.24;
  vec2 q = vec2(p.x, p.y / tilt);
  float r = length(q);
  // The disk, in front of the hole below its middle and bent over it above (the lensed far side).
  float disk = smoothstep(0.10, 0.13, r) * smoothstep(0.34, 0.16, r);
  float arc = exp(-pow((length(p * vec2(1.0, 1.25)) - 0.085) * 55.0, 2.0)) * smoothstep(-0.01, 0.03, p.y);
  float swirl = 0.55 + 0.45 * fbm(vec2(atan(q.y, q.x) * 3.0 - t * 0.2, r * 16.0));
  float doppler = 0.5 + 0.5 * (q.x / max(r, 0.001));
  float ring = exp(-pow((length(p) - 0.072) * 140.0, 2.0)) * (0.5 + 1.0 * s);
  float shadow = smoothstep(0.072, 0.06, length(p));
  float front = step(p.y, 0.0);
  vec3 light = mix(uGlowB, uGlowA, doppler);
  vec3 c = light * (disk * swirl * (0.35 + 0.65 * doppler) + arc * 0.6) * (0.7 + 0.8 * s) + uGlowA * ring;
  return c * (1.0 - shadow * (1.0 - front * disk));
}

void main() {
  vec2 uv = vUv;
  float t = uTime;
  float aspect0 = uResolution.x / uResolution.y;
  // The whole far plane sways in the current: gently in space, more under the sea.
  float sway = uWorld == 2 ? 0.009 : 0.004;
  vec2 drift = currentAt(uv * vec2(aspect0, 1.0) * 1.3, t * 0.04) * sway;
  vec2 bgUv = uWorld == 5 ? lens(uv + drift) : uv + drift;
  vec3 c = backdrop(bgUv) * (0.55 + 0.45 * uLight);
  float energy = uEnergy;
  float s = uSignature;
  c += gas(uv + drift * 2.0, t, (0.35 + 0.4 * energy + 0.3 * s) * uLight);
  if (uWorld == 0) {
    c += rays(uv, t, mix(uGlowA, uGlowB, 0.5), 0.12 * uLight);
    c += starBirth(uv, t, 0.25 + s);
  } else if (uWorld == 1) {
    c += neonWorld(uv, t, s) * uLight;
  } else if (uWorld == 2) {
    c += rays(uv + drift * 1.5, t, uGlowA, (0.22 + 0.18 * s) * uLight);
    c += currents(uv, t, (0.10 + 0.08 * energy) * uLight);
    vec4 ray = mantas(uv + drift, t);
    c = mix(c, ray.rgb * (0.4 + 0.6 * uLight), ray.a);
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
  c += mix(uGlowA, uGlowB, 0.5) * exp(-pow((across - (uSweep.x * 2.0 - 0.5)) * 1.6, 2.0)) * uSweep.y;
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
${NOISE}

void main() {
  float id = float(gl_VertexID);
  // Most particles far away, few near the lens: the near ones are large and soft.
  float depth = floor(pow(h(id, 1.0), 2.2) * 5.0) / 4.0;  // 0 far .. 1 near
  vec2 seed = vec2(h(id, 2.0), h(id, 3.0));
  float speed = (0.15 + 0.85 * h(id, 4.0)) * (0.3 + depth);
  vec2 velocity;
  if (uWorld == 2) velocity = vec2(0.002 * sin(uTime * 0.2 + id), -0.008);       // plankton rises
  else if (uWorld == 4) velocity = vec2(0.004 * sin(uTime * 0.3 + id), -0.012);  // embers rise
  else if (uWorld == 1) velocity = vec2(0.01, 0.0);                              // sparks scan
  else if (uWorld == 3) velocity = vec2(0.0015, -0.001);                        // glints hang
  else velocity = vec2(0.004, 0.0012);                                          // stars drift
  vec2 p = fract(seed + velocity * speed * uTime + 0.03 * vec2(sin(uTime * 0.05 + id), cos(uTime * 0.04 + id * 1.3)));
  // Carried by the current: the particles swirl together, the near ones most.
  float aspectP = uResolution.x / uResolution.y;
  float carried = (uWorld == 2 ? 0.05 : 0.025) * (0.6 + 0.6 * depth);
  p += currentAt(p * vec2(aspectP, 1.0) * 1.3, uTime * 0.04) * carried;
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
  gl_PointSize = clamp((2.0 + depth * depth * 18.0) * (1.0 + blur * 2.0) * scale, 1.0, 80.0);
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

/**
 * Abyss: schools of fish swimming across, two depths, each pass a new school
 * (its path, its size, its density). Each fish keeps its place in the school
 * with a wobble of its own, turns with the school and beats its tail. Dark
 * silhouettes lit from above, blended over the scene.
 */
export const FISH_COUNT = 160;

export const FISH_VERTEX = /* glsl */ `#version 300 es
precision highp float;
uniform vec2 uResolution;
uniform float uTime;
uniform vec4 uCamera;
out float vAngle;
out float vTail;
out float vShade;
out float vHere;

float h(float n, float s) { return fract(sin(n * 127.1 + s * 311.7) * 43758.5453); }

vec2 path(float u, float pass, float dir) {
  float y0 = 0.25 + 0.5 * h(pass, 3.0);
  float x = mix(-0.45, 1.45, dir > 0.0 ? u : 1.0 - u);
  return vec2(x, y0 + 0.09 * sin(u * 6.2831 * (0.8 + 0.6 * h(pass, 4.0)) + pass)
                    + 0.04 * sin(u * 23.0 + pass * 2.0));
}

void main() {
  float id = float(gl_VertexID);
  float school = id < ${FISH_COUNT / 2}.0 ? 0.0 : 1.0;
  float i = id - school * ${FISH_COUNT / 2}.0;
  float period = 95.0 + 55.0 * school;
  float journey = uTime / period + school * 0.57;
  float pass = floor(journey) + school * 53.0;
  float u = fract(journey);
  float dir = h(pass, 1.0) < 0.5 ? 1.0 : -1.0;
  // Some passes are empty, and each school has its own size.
  float present = step(h(pass, 2.0), 0.75) * step(i, 40.0 + 40.0 * h(pass, 5.0));
  float radius = (0.035 + 0.03 * h(pass, 6.0)) * (1.0 + 0.6 * school)
               * (1.0 + 0.25 * sin(uTime * 0.21 + pass));
  // Its place in the school: a flattened cloud, each fish wobbling, the front leading.
  float a = h(i, 7.0) * 6.2831;
  float r = sqrt(h(i, 8.0));
  vec2 local = vec2(cos(a) * 1.6, sin(a) * 0.7) * r * radius;
  local += 0.012 * vec2(sin(uTime * (0.6 + 0.5 * h(i, 9.0)) + i), cos(uTime * (0.7 + 0.4 * h(i, 10.0)) + i * 1.7));
  float lag = local.x * dir * 0.002;
  vec2 centre = path(u - lag, pass, dir);
  vec2 ahead = path(u - lag + 0.002, pass, dir);
  vec2 heading = normalize((ahead - centre) * vec2(uResolution.x / uResolution.y, 1.0));
  vec2 p = centre + vec2(local.x * heading.x - local.y * heading.y, local.x * heading.y + local.y * heading.x)
                  / vec2(uResolution.x / uResolution.y, 1.0);
  // The camera, at the school's depth.
  float depth = 0.55 + 0.3 * school;
  float aspect = uResolution.x / uResolution.y;
  vec2 q = (p - 0.5) * vec2(aspect, 1.0);
  float c = cos(uCamera.w * depth);
  float s = sin(uCamera.w * depth);
  q = mat2(c, -s, s, c) * q;
  q /= mix(1.0, uCamera.z, depth);
  q += uCamera.xy * depth;
  q /= vec2(aspect, 1.0);
  gl_Position = vec4(q * 2.0, 0.0, 1.0);
  float scale = uResolution.y / 1080.0;
  gl_PointSize = (24.0 + 20.0 * school) * (0.75 + 0.5 * h(i, 11.0)) * scale * present;
  vAngle = atan(heading.y, heading.x);
  vTail = uTime * (5.0 + 3.0 * h(i, 12.0)) + i;
  vShade = 0.6 + 0.4 * h(i, 13.0);
  vHere = present;
}`;

export const FISH_FRAGMENT = /* glsl */ `#version 300 es
precision highp float;
in float vAngle;
in float vTail;
in float vShade;
in float vHere;
uniform vec3 uBody;
uniform vec3 uRim;
out vec4 outColour;
void main() {
  if (vHere < 0.5) discard;
  // gl_PointCoord runs downwards: flip it, then turn it to the fish's heading.
  vec2 d = vec2(gl_PointCoord.x - 0.5, 0.5 - gl_PointCoord.y);
  float c = cos(vAngle);
  float s = sin(vAngle);
  vec2 f = vec2(c * d.x + s * d.y, -s * d.x + c * d.y);
  float wag = sin(vTail) * 0.05;
  float body = 1.0 - smoothstep(0.85, 1.0, length(vec2(f.x / 0.34, (f.y - wag * (0.2 - f.x)) / 0.1)));
  vec2 t = f - vec2(-0.36, wag);
  float tail = step(t.x, 0.0) * step(-0.12, t.x) * (1.0 - smoothstep(0.0, 0.02, abs(t.y) + t.x * 0.6));
  float shape = max(body, tail);
  if (shape < 0.01) discard;
  // Lit from above, as the rays fall.
  float lit = smoothstep(-0.02, 0.08, d.y);
  vec3 colour = uBody * vShade + uRim * lit * 0.5;
  outColour = vec4(colour, shape * 0.7);
}`;
