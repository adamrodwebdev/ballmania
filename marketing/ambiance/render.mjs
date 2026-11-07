// The ambience factory (specification § 3.18): renders a long ambience video
// from the game's music and worlds, with its thumbnail, three Shorts and a
// manifest. It writes files only: it publishes nothing.
//
// Usage: npm run ambiance -- --mood <id> --minutes <n> --seed <s> [--small] [--check]
//   --small  640 × 360, Shorts of 5 s (the smoke test of the CI)
//   --check  renders samples again and compares them with the manifest, writing nothing
//   --scan   the flash check alone, over the whole video at 320 × 180, writing nothing
//   --stills one picture per mood (1280 × 720) at its first signature effect, in out/stills/
//   --guard <file>  another guard than guard.json (games watched, temperatures)
// Needs Google Chrome (H.264 encoding) and ffmpeg on the PATH.
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createReadStream, existsSync } from 'node:fs';
import {
  appendFile,
  mkdir,
  open,
  readdir,
  readFile,
  rm,
  stat,
  statfs,
  writeFile,
} from 'node:fs/promises';
import { platform } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { chromium } from '@playwright/test';
import { createServer } from 'vite';

const run = promisify(execFile);
const root = fileURLToPath(new URL('../../', import.meta.url));
const here = fileURLToPath(new URL('./', import.meta.url));
const RATE = 48_000;
const FPS = 30;
/** Frames per batch: five minutes, after which the guard looks at the machine. */
const BATCH = 5 * 60 * FPS;

// ---------------------------------------------------------------- arguments

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const at = args.indexOf(`--${name}`);
  return at >= 0 ? args[at + 1] : fallback;
};
const flag = (name) => args.includes(`--${name}`);
const stills = flag('stills');
const moodId = option('mood');
const minutes = Number(option('minutes', stills ? '60' : undefined));
const seed = Number(option('seed', '1'));
const small = flag('small');
const checking = flag('check');
const scanning = flag('scan');
if (
  (!moodId && !stills) ||
  !Number.isFinite(minutes) ||
  minutes <= 0 ||
  minutes > 180 ||
  !Number.isInteger(seed)
) {
  console.error(
    'Usage: npm run ambiance -- --mood <id> --minutes <1 to 180> --seed <integer> [--small] [--check]',
  );
  process.exit(2);
}
const seconds = Math.round(minutes * 60);
const SIZE = small
  ? { video: [640, 360], short: [360, 640], shortSeconds: 5, thumbnail: [640, 360], loops: 5 }
  : {
      video: [1920, 1080],
      short: [1080, 1920],
      shortSeconds: 20,
      thumbnail: [1280, 720],
      loops: 17,
    };
/** Seconds of a Short's seam: long enough for its cross-fade never to flash. */
const SEAM = Math.min(5, SIZE.shortSeconds / 2);
const name = `${moodId}-${seed}-${minutes}m${small ? '-small' : ''}`;
const outRoot = join(here, 'out');
const out = join(outRoot, name);
const work = join(out, 'work');
const begun = Date.now();
const log = (text) => console.log(`[${((Date.now() - begun) / 60000).toFixed(1)} min] ${text}`);

// ---------------------------------------------------------------- the guard

const guard = JSON.parse(await readFile(option('guard', join(here, 'guard.json')), 'utf8'));
const pauses = [];

const gamesRunning = async () => {
  if (platform() !== 'win32') return [];
  try {
    const { stdout } = await run('tasklist', ['/FO', 'CSV', '/NH']);
    const names = stdout.split(/\r?\n/).map((line) =>
      line
        .split('","')[0]
        ?.replace(/^"/, '')
        .replace(/\.exe$/i, '')
        .toLowerCase(),
    );
    return guard.games.filter((game) => names.includes(game.toLowerCase()));
  } catch {
    return [];
  }
};

const gpuTemperature = async () => {
  try {
    const { stdout } = await run('nvidia-smi', [
      '--query-gpu=temperature.gpu',
      '--format=csv,noheader',
    ]);
    const value = Math.round(Number.parseFloat(stdout));
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
};

/** Waits while a game runs or the machine is hot: a pause of its own, never a suspension. */
const stayCool = async (where) => {
  let since = null;
  let reason = '';
  for (;;) {
    const games = await gamesRunning();
    const temperature = await gpuTemperature();
    const hot = temperature !== null && temperature >= (since ? guard.gpuCool : guard.gpuHot);
    if (!games.length && !hot) break;
    reason = games.length ? `game running (${games.join(', ')})` : `GPU at ${temperature} °C`;
    if (!since) {
      since = Date.now();
      log(`Pause before ${where}: ${reason}`);
    }
    await new Promise((resolve) => setTimeout(resolve, guard.pollSeconds * 1000));
  }
  if (since) {
    pauses.push({ before: where, reason, seconds: Math.round((Date.now() - since) / 1000) });
    log(`Resume after ${Math.round((Date.now() - since) / 1000)} s`);
  }
};

// ---------------------------------------------------------------- helpers

const sha256 = (data) => createHash('sha256').update(data).digest('hex');

const fileHash = (path) =>
  new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    createReadStream(path)
      .on('data', (chunk) => hash.update(chunk))
      .on('end', () => resolve(hash.digest('hex')))
      .on('error', reject);
  });

const ffmpeg = async (...ffArgs) => {
  try {
    return await run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...ffArgs], {
      maxBuffer: 64 * 1024 * 1024,
    });
  } catch (error) {
    throw new Error(`ffmpeg failed: ${error.stderr ?? error.message}`);
  }
};

/** Pipes raw interleaved 32-bit stereo into ffmpeg's AAC encoder. */
const encodeSound = (source, target) =>
  ffmpeg(
    '-f',
    'f32le',
    '-ar',
    String(RATE),
    '-ac',
    '2',
    '-i',
    source,
    '-c:a',
    'aac',
    '-b:a',
    '256k',
    target,
  );

const probe = async (path) => {
  const { stdout } = await run('ffprobe', [
    '-v',
    'error',
    '-show_streams',
    '-show_format',
    '-of',
    'json',
    path,
  ]);
  return JSON.parse(stdout);
};

/** ffmpeg's own loudness reading (ebur128), to cross-check ours. */
const ffmpegLoudness = async (path) => {
  const result = await run(
    'ffmpeg',
    ['-hide_banner', '-nostats', '-i', path, '-af', 'ebur128=peak=true', '-f', 'null', '-'],
    { maxBuffer: 256 * 1024 * 1024 },
  ).catch((error) => error);
  const text = String(result.stderr ?? '');
  const summary = text.slice(text.lastIndexOf('Summary:'));
  const integrated = Number(/I:\s+(-?[\d.]+) LUFS/.exec(summary)?.[1]);
  const peak = Number(/Peak:\s+(-?[\d.]+) dBFS/.exec(summary)?.[1]);
  return { integrated, truePeak: peak };
};

const interleave = (left, right, gainAt) => {
  const out = new Float32Array(left.length * 2);
  for (let i = 0; i < left.length; i++) {
    const g = gainAt ? gainAt(i) : 1;
    out[2 * i] = left[i] * g;
    out[2 * i + 1] = right[i] * g;
  }
  return out;
};

// ---------------------------------------------------------------- the page

let uploads = work;
const server = await createServer({
  root,
  // No hot reload, no file watching: an edit to the code during a render must not reload the page.
  server: { port: 5198, strictPort: true, hmr: false, watch: null },
  logLevel: 'warn',
  plugins: [
    {
      name: 'ambiance-uploads',
      configureServer(vite) {
        vite.middlewares.use('/__ambiance/put', (request, response) => {
          const url = new URL(request.url ?? '', 'http://localhost');
          const file = url.searchParams.get('file') ?? '';
          if (!/^[\w.-]+$/.test(file) || checking) {
            response.statusCode = 400;
            response.end();
            return;
          }
          const parts = [];
          request.on('data', (chunk) => parts.push(chunk));
          request.on('end', async () => {
            const body = Buffer.concat(parts);
            const target = join(uploads, file);
            if (url.searchParams.get('append') === '1') await appendFile(target, body);
            else await writeFile(target, body);
            response.end('ok');
          });
        });
      },
    },
  ],
});

const { Mood } = await server.ssrLoadModule('/marketing/ambiance/Mood.ts');
const { SoundAnalyzer, Limiter, LoudnessMeter, gainTo, fadeAt, fromDecibels } =
  await server.ssrLoadModule('/marketing/ambiance/Loudness.ts');
const { shorts, thumbnailAt } = await server.ssrLoadModule('/marketing/ambiance/Highlights.ts');
const moods = Mood.parseAll(JSON.parse(await readFile(join(here, 'moods.json'), 'utf8')));
const mood = moods.find((m) => m.id === moodId);
if (!mood && !stills) {
  console.error(`Unknown mood "${moodId}". Moods: ${moods.map((m) => m.id).join(', ')}`);
  await server.close();
  process.exit(2);
}

const commit = await run('git', ['rev-parse', 'HEAD'], { cwd: root }).then(
  (r) => r.stdout.trim(),
  () => 'unknown',
);
const changed = await run('git', ['status', '--porcelain'], { cwd: root }).then(
  (r) =>
    r.stdout
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => line.slice(3)),
  () => [],
);
const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
const ffmpegVersion = await run('ffmpeg', ['-version']).then(
  (r) => r.stdout.split(/\r?\n/)[0],
  () => null,
);
if (!ffmpegVersion && !checking) {
  console.error(
    'ffmpeg is needed on the PATH (winget install Gyan.FFmpeg, or apt install ffmpeg).',
  );
  await server.close();
  process.exit(2);
}

await server.listen();
const gpuArgs =
  platform() === 'win32'
    ? ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist']
    : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
const browser = await chromium.launch({ channel: 'chrome', args: gpuArgs });
const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
page.on('console', (message) => {
  if (message.type() === 'error' || message.type() === 'warning')
    console.log(`  page: ${message.text()}`);
});
page.on('pageerror', (error) => console.error(error));
await page.goto('http://localhost:5198/marketing/ambiance/ambiance.html');
await page.waitForSelector('body[data-ready="true"]', { state: 'attached', timeout: 60_000 });
const chromeVersion = browser.version();

const call = (method, ...values) =>
  page.evaluate(([m, v]) => window.ambiance[m](...v), [method, values]);

let exitCode = 0;
try {
  if (stills) {
    await renderStills();
  } else {
    const setup = await call('setup', { mood: moodId, seconds, seed });
    const plan = setup.plan;
    const planHash = sha256(setup.notes);
    log(`${mood.name.en}: ${plan.sections.length} sections, ${minutes} min, seed ${seed}`);
    if (checking) exitCode = await check(plan, planHash);
    else if (scanning) exitCode = await scan();
    else await produce(plan, planHash);
  }
} catch (error) {
  console.error(error);
  exitCode = 1;
} finally {
  await browser.close();
  await server.close();
}
process.exit(exitCode);

// ---------------------------------------------------------------- scan

/** The flash check alone, fast: the whole picture at 320 × 180, nothing encoded or written. */
async function scan() {
  await call('openVideo', 'scan', 320, 180, false);
  const frameCount = seconds * FPS;
  for (let from = 0; from < frameCount; from += BATCH) {
    await stayCool(`frame ${from}`);
    await call('frames', {
      video: 'scan',
      from,
      count: Math.min(BATCH, frameCount - from),
      offset: 0,
      loop: null,
      fingerprintEvery: 0,
    });
  }
  const flashes = await call('closeVideo', 'scan');
  const passed = flashes.frame <= 0.1 && flashes.zone <= 0.1;
  log(
    `${passed ? '✓' : '✗'} flashes: frame ${flashes.frame.toFixed(3)}, zone ${flashes.zone.toFixed(3)}` +
      ` (worst at ${flashes.at.toFixed(1)} s)`,
  );
  return passed ? 0 : 1;
}

// ---------------------------------------------------------------- stills

/** One picture per mood, at its first signature effect: the look of each world at a glance. */
async function renderStills() {
  const dir = join(outRoot, 'stills');
  await mkdir(dir, { recursive: true });
  uploads = dir;
  for (const each of moods) {
    const setup = await call('setup', { mood: each.id, seconds, seed });
    const at = thumbnailAt(setup.plan, each);
    await call('thumbnail', at, 1280, 720, `${each.id}.jpg`);
    log(`${each.name.en}: ${join(dir, `${each.id}.jpg`)} (at ${at.toFixed(1)} s)`);
  }
}

// ---------------------------------------------------------------- produce

async function produce(plan, planHash) {
  const expected = (seconds / 3600) * 5.4e9 + (seconds / 3600) * 2.8e9;
  await mkdir(work, { recursive: true });
  const disk = await statfs(out);
  if (disk.bavail * disk.bsize < 2 * expected) {
    throw new Error(`Not enough disk: ${((expected * 2) / 1e9).toFixed(1)} GB needed`);
  }
  uploads = work;

  // The sound: section after section, summed over their cross-fades, faded.
  await stayCool('the sound');
  const total = Math.round(seconds * RATE);
  const raw = join(work, 'sound.f32');
  const final = join(work, 'final.f32');
  await rm(raw, { force: true });
  const rawFile = await open(raw, 'w');
  const meter = new LoudnessMeter();
  const sections = [];
  let carryL = new Float32Array(0);
  let carryR = new Float32Array(0);
  let written = 0;
  for (const section of plan.sections) {
    const rendered = await call('audio', section.index, true);
    const pcm = join(work, `pcm-${section.index}.f32`);
    const bytes = await readFile(pcm);
    await rm(pcm);
    const n = rendered.samples;
    const left = new Float32Array(bytes.buffer, bytes.byteOffset, n).slice();
    const right = new Float32Array(bytes.buffer, bytes.byteOffset + n * 4, n).slice();
    for (let i = 0; i < carryL.length && i < n; i++) {
      left[i] += carryL[i];
      right[i] += carryR[i];
    }
    const next = plan.sections[section.index + 1];
    const until = Math.min(total, next ? Math.round(next.start * RATE) : total);
    const emit = until - written;
    const outL = new Float32Array(emit);
    const outR = new Float32Array(emit);
    outL.set(left.subarray(0, Math.min(n, emit)));
    outR.set(right.subarray(0, Math.min(n, emit)));
    carryL = left.slice(Math.min(n, emit));
    carryR = right.slice(Math.min(n, emit));
    const from = written;
    const fade = (i) => fadeAt((from + i) / RATE, seconds, mood.fade);
    for (let i = 0; i < emit; i++) {
      const g = fade(i);
      outL[i] *= g;
      outR[i] *= g;
    }
    meter.push(outL, outR);
    const chunk = interleave(outL, outR);
    await rawFile.write(new Uint8Array(chunk.buffer));
    written += emit;
    sections.push({
      index: section.index,
      start: section.start,
      seconds: section.seconds,
      crossfade: section.crossfade,
      progression: section.progression,
      shift: section.shift,
      voicing: section.voicing,
      voices: section.voices,
      density: round(section.density, 3),
      brightness: Math.round(section.brightness),
      energy: round(section.energy, 3),
      kind: section.kind,
      shot: section.shot,
      hash: rendered.hash,
    });
    log(`Sound: section ${section.index + 1}/${plan.sections.length}`);
  }
  await rawFile.close();

  // Brought to its loudness, limited under its ceiling, checked.
  const before = meter.reading();
  const gain = gainTo(before.integrated, mood.loudness);
  const limiter = new Limiter(fromDecibels(-2.5));
  const analyzer = new SoundAnalyzer();
  const finalFile = await open(final, 'w');
  let skip = Math.round(0.005 * RATE);
  const emitLimited = async (l, r) => {
    let start = 0;
    if (skip > 0) {
      start = Math.min(skip, l.length);
      skip -= start;
    }
    const L = l.subarray(start);
    const R = r.subarray(start);
    analyzer.push(L, R);
    await finalFile.write(new Uint8Array(interleave(L, R).buffer));
  };
  const rawRead = await open(raw, 'r');
  const frames = RATE;
  const buffer = Buffer.alloc(frames * 8);
  for (;;) {
    const { bytesRead } = await rawRead.read(buffer, 0, buffer.length, null);
    if (!bytesRead) break;
    const count = bytesRead / 8;
    const data = new Float32Array(buffer.buffer, buffer.byteOffset, count * 2);
    const l = new Float32Array(count);
    const r = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      l[i] = data[2 * i] * gain;
      r[i] = data[2 * i + 1] * gain;
    }
    limiter.process(l, r);
    await emitLimited(l, r);
  }
  await rawRead.close();
  const tail = limiter.flush();
  await emitLimited(tail.left, tail.right);
  await finalFile.close();
  await rm(raw);
  const report = analyzer.report();
  const sound = join(work, 'sound.m4a');
  await encodeSound(final, sound);
  const crossCheck = await ffmpegLoudness(sound);
  log(
    `Sound: ${report.integrated.toFixed(1)} LUFS, true peak ${report.truePeak.toFixed(1)} dBTP, ` +
      `${report.clicks.length} clicks, ${report.silences.length} silent seconds`,
  );

  // The picture, five minutes at a time, the guard looking at the machine in between.
  const [width, height] = SIZE.video;
  const opened = await call('openVideo', 'video', width, height, true);
  log(`Picture on ${opened.renderer}`);
  const frameCount = seconds * FPS;
  const fingerprints = [];
  let drawing = 0;
  for (let from = 0; from < frameCount; from += BATCH) {
    await stayCool(`frame ${from}`);
    const result = await call('frames', {
      video: 'video',
      from,
      count: Math.min(BATCH, frameCount - from),
      offset: 0,
      loop: null,
      fingerprintEvery: FPS,
    });
    fingerprints.push(...result.fingerprints);
    drawing += result.milliseconds;
    log(
      `Picture: ${Math.min(frameCount, from + BATCH) / FPS / 60} of ${minutes} min ` +
        `(${(result.milliseconds / Math.min(BATCH, frameCount - from)).toFixed(1)} ms a frame)`,
    );
  }
  const flashes = await call('closeVideo', 'video');
  const video = join(out, 'ambiance.mp4');
  await ffmpeg(
    '-fflags',
    '+genpts',
    '-r',
    String(FPS),
    '-i',
    join(work, 'video.h264'),
    '-i',
    sound,
    '-map',
    '0:v',
    '-map',
    '1:a',
    '-c',
    'copy',
    '-movflags',
    '+faststart',
    video,
  );
  await rm(join(work, 'video.h264'));

  // The thumbnail and the Shorts.
  const thumbAt = thumbnailAt(plan, mood);
  await call('thumbnail', thumbAt, SIZE.thumbnail[0], SIZE.thumbnail[1], 'thumbnail.jpg');
  await rm(join(out, 'thumbnail.jpg'), { force: true });
  await writeFile(join(out, 'thumbnail.jpg'), await readFile(join(work, 'thumbnail.jpg')));
  const moments = shorts(plan, mood, SIZE.shortSeconds);
  const shortFiles = [];
  const finalRead = await open(final, 'r');
  for (const [index, moment] of moments.entries()) {
    await stayCool(`short ${index + 1}`);
    const file = `short-${index + 1}`;
    // The loop point where the end looks most like the start: within 10 % of the length.
    const candidates = Array.from(
      { length: SIZE.loops },
      (_, i) => Math.round(moment.seconds * (0.9 + (0.2 * i) / (SIZE.loops - 1)) * FPS) / FPS,
    );
    // …and the start, a few seconds either side, until the seam is gentle enough.
    let loop = null;
    let start = moment.start;
    for (const shift of [0, -3, 3, -6, 6]) {
      const from = moment.start + shift;
      if (from < 0 || from + moment.seconds * 1.1 + SEAM * 1.6 > plan.seconds) continue;
      const tried = await call(
        'loopPlan',
        { width: SIZE.short[0], height: SIZE.short[1] },
        from,
        candidates,
        [SEAM, SEAM * 1.3, SEAM * 1.6],
      );
      if (!loop || tried.worst < loop.worst) {
        loop = tried;
        start = from;
      }
      if (loop.worst < 0.085) break;
    }
    const { length, fade } = loop;
    await call('openVideo', file, SIZE.short[0], SIZE.short[1], true);
    await call('frames', {
      video: file,
      from: 0,
      count: Math.round(length * FPS),
      offset: start,
      loop: { seconds: length, fade },
      fingerprintEvery: 0,
    });
    const shortFlashes = await call('closeVideo', file);
    // Its sound: the same seam, equal power.
    const n = Math.round(length * RATE);
    const seam = Math.round(fade * RATE);
    const read = async (at, count) => {
      const bytes = Buffer.alloc(count * 8);
      await finalRead.read(bytes, 0, bytes.length, Math.round(at * RATE) * 8);
      return new Float32Array(bytes.buffer, bytes.byteOffset, count * 2);
    };
    const body = await read(start, n);
    const after = await read(start + length, seam);
    for (let i = 0; i < seam; i++) {
      const w = (Math.PI / 2) * (i / seam);
      for (const c of [0, 1])
        body[2 * i + c] = body[2 * i + c] * Math.sin(w) + after[2 * i + c] * Math.cos(w);
    }
    const pcm = join(work, `${file}.f32`);
    await writeFile(pcm, new Uint8Array(body.buffer, body.byteOffset, body.byteLength));
    const shortSound = join(work, `${file}.m4a`);
    await encodeSound(pcm, shortSound);
    const target = join(out, `${file}.mp4`);
    await ffmpeg(
      '-fflags',
      '+genpts',
      '-r',
      String(FPS),
      '-i',
      join(work, `${file}.h264`),
      '-i',
      shortSound,
      '-map',
      '0:v',
      '-map',
      '1:a',
      '-c',
      'copy',
      '-movflags',
      '+faststart',
      target,
    );
    shortFiles.push({
      file: `${file}.mp4`,
      ...moment,
      start,
      seconds: length,
      seam: fade,
      seamWorst: Number(loop.worst.toFixed(3)),
      flashes: shortFlashes,
    });
    log(`Short ${index + 1}: from ${start.toFixed(1)} s`);
  }
  await finalRead.close();

  // What the files are, checked.
  const info = await probe(video);
  const videoStream = info.streams.find((s) => s.codec_type === 'video');
  const audioStream = info.streams.find((s) => s.codec_type === 'audio');
  const duration = Number(info.format.duration);
  const files = [];
  for (const file of ['ambiance.mp4', 'thumbnail.jpg', ...shortFiles.map((s) => s.file)]) {
    const path = join(out, file);
    files.push({ file, bytes: (await stat(path)).size, sha256: await fileHash(path) });
  }
  const machineMinutes = (Date.now() - begun) / 60000;
  const checks = {
    loudness: Math.abs(report.integrated - mood.loudness) <= 0.5,
    truePeak: report.truePeak <= -2,
    clicks: report.clicks.length === 0,
    silences: report.silences.length === 0,
    mono: report.monoLoss <= 3,
    flashes: [flashes, ...shortFiles.map((s) => s.flashes)].every(
      (f) => f.frame <= 0.1 && f.zone <= 0.1,
    ),
    duration: Math.abs(duration - seconds) < 0.5,
    format:
      videoStream?.codec_name === 'h264' &&
      videoStream.width === width &&
      videoStream.height === height &&
      audioStream?.codec_name === 'aac' &&
      Number(audioStream.sample_rate) === RATE &&
      audioStream.channels === 2,
    crossCheck: Math.abs(crossCheck.integrated - report.integrated) <= 0.3,
    // The guard's pauses (a game, the heat) are not the factory's time. Not measured in the
    // small smoke render: the CI draws in software (SwiftShader), forty times slower than a GPU.
    budget: small
      ? null
      : machineMinutes - pauses.reduce((sum, p) => sum + p.seconds, 0) / 60 <=
        Math.max(10, minutes),
  };
  const manifest = {
    factory: { version: pkg.version, schema: 1 },
    mood: { ...mood },
    seed,
    minutes,
    small,
    commit,
    modifiedFiles: changed,
    clean: changed.length === 0,
    chrome: chromeVersion,
    ffmpeg: ffmpegVersion,
    renderer: opened.renderer,
    plan: { hash: planHash, barSeconds: plan.barSeconds, root: plan.root, sections },
    sound: {
      gainDb: round(20 * Math.log10(gain), 2),
      integrated: round(report.integrated, 2),
      range: round(report.range, 2),
      momentaryMax: round(report.momentaryMax, 2),
      truePeak: round(report.truePeak, 2),
      monoLoss: round(report.monoLoss, 2),
      clicks: report.clicks.map((t) => round(t, 3)),
      silences: report.silences,
      ffmpeg: crossCheck,
    },
    picture: {
      width,
      height,
      fps: FPS,
      fingerprint: sha256(fingerprints.map((f) => f.hash).join('')),
      perMinute: perMinute(fingerprints),
      fingerprints,
      flashes,
      milliseconds: Math.round(drawing),
    },
    thumbnail: { at: round(thumbAt, 2) },
    shorts: shortFiles,
    listen: listeningPoints(plan, sections),
    files,
    machine: {
      minutes: round(machineMinutes, 1),
      working: round(machineMinutes - pauses.reduce((sum, p) => sum + p.seconds, 0) / 60, 1),
      pauses,
    },
    checks,
    passed: Object.values(checks).every((passed) => passed !== false),
  };
  await writeFile(join(out, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  await rm(work, { recursive: true, force: true });
  await prune();
  log(`Done in ${machineMinutes.toFixed(1)} min: ${out}`);
  for (const [check, passed] of Object.entries(checks)) {
    log(
      `  ${passed === null ? '–' : passed ? '✓' : '✗'} ${check}${passed === null ? ' (not measured)' : ''}`,
    );
  }
  if (!manifest.passed) exitCode = 1;
}

/** One fingerprint per minute of picture, from the per-second ones. */
function perMinute(fingerprints) {
  const minutes = new Map();
  for (const f of fingerprints) {
    const minute = Math.floor(f.frame / FPS / 60);
    minutes.set(minute, (minutes.get(minute) ?? '') + f.hash);
  }
  return [...minutes.values()].map((text) => sha256(text).slice(0, 16));
}

/** Where to listen: the start, two joints between sections, the end. */
function listeningPoints(plan, sections) {
  const joints = sections
    .slice(1, 3)
    .map((s) => ({ what: `joint ${s.index}`, at: round(s.start - 5, 1) }));
  return [
    { what: 'start', at: 0 },
    ...joints,
    { what: 'end', at: round(Math.max(0, plan.seconds - 60), 1) },
  ];
}

function round(value, digits) {
  return Number(value.toFixed(digits));
}

/** Keeps the two latest renders of this mood, deleting older ones the factory made. */
async function prune() {
  const entries = await readdir(outRoot, { withFileTypes: true });
  const mine = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || !entry.name.startsWith(`${moodId}-`)) continue;
    const manifest = join(outRoot, entry.name, 'manifest.json');
    if (!existsSync(manifest)) continue;
    mine.push({ dir: join(outRoot, entry.name), time: (await stat(manifest)).mtimeMs });
  }
  mine.sort((a, b) => b.time - a.time);
  for (const old of mine.slice(2)) {
    await rm(old.dir, { recursive: true, force: true });
    log(`Removed an older render: ${old.dir}`);
  }
}

// ---------------------------------------------------------------- check

async function check(plan, planHash) {
  const path = join(out, 'manifest.json');
  if (!existsSync(path)) {
    console.error(`No manifest to check against: ${path}`);
    return 2;
  }
  const manifest = JSON.parse(await readFile(path, 'utf8'));
  const failures = [];
  if (manifest.plan.hash !== planHash) failures.push('the plan differs');
  // A sample drawn from the seed: twelve frames, the first joint and two other sections.
  let state = (seed * 2654435761) >>> 0;
  const next = (max) => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state % max;
  };
  const prints = manifest.picture.fingerprints;
  const frames = new Set();
  while (frames.size < Math.min(12, prints.length)) frames.add(prints[next(prints.length)]);
  await call('openVideo', 'probe', manifest.picture.width, manifest.picture.height, false);
  for (const expected of frames) {
    const result = await call('frames', {
      video: 'probe',
      from: expected.frame,
      count: 1,
      offset: 0,
      loop: null,
      fingerprintEvery: 1,
    });
    if (result.fingerprints[0]?.hash !== expected.hash)
      failures.push(`frame ${expected.frame} differs`);
  }
  await call('closeVideo', 'probe');
  const indices = new Set([Math.min(1, plan.sections.length - 1)]);
  while (indices.size < Math.min(3, plan.sections.length)) indices.add(next(plan.sections.length));
  for (const index of indices) {
    const result = await call('audio', index, false);
    if (result.hash !== manifest.plan.sections[index].hash)
      failures.push(`the sound of section ${index} differs`);
  }
  log(`Checked the plan, ${frames.size} frames and ${indices.size} sections`);
  if (failures.length) {
    for (const failure of failures) console.error(`✗ ${failure}`);
    return 1;
  }
  log('✓ Same plan, same pictures, same sound');
  return 0;
}
