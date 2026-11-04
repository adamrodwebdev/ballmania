import { readFileSync } from 'node:fs';
import { brotliDecompressSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';

/**
 * Russian is set in its own Nunito cut (russian.css), downloaded only for it. A character of
 * the Russian copy that the cut or its `unicode-range` lacks sends the browser down the stack:
 * WebKit and Firefox then fetch Fredoka, even for an invisible soft hyphen (U+00AD), which
 * Chromium sets with no face at all, so a Chromium run never sees it (v1.9.0).
 */

const file = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url));

/** WOFF2 numbers of 1 to 5 bytes, 7 bits each (WOFF2, 6.1.1). */
const base128 = (data: Buffer, at: { offset: number }): number => {
  let value = 0;
  for (let bytes = 0; bytes < 5; bytes++) {
    const byte = data[at.offset++]!;
    value = value * 128 + (byte & 0x7f);
    if ((byte & 0x80) === 0) return value;
  }
  throw new Error('a UIntBase128 longer than 5 bytes');
};

/** The `cmap` table of a WOFF2 font: its index among the known tags is 0 (WOFF2, 5.1). */
function cmapOf(woff2: Buffer): Buffer {
  expect(woff2.toString('latin1', 0, 4)).toBe('wOF2');
  const tables = woff2.readUInt16BE(12);
  const compressed = woff2.readUInt32BE(20);
  const at = { offset: 48 };
  let start = 0;
  let cmap: { start: number; length: number } | undefined;
  for (let table = 0; table < tables; table++) {
    const flags = woff2[at.offset++]!;
    const tag = flags & 0x3f;
    if (tag === 63) at.offset += 4;
    const length = base128(woff2, at);
    // glyf (10) and loca (11) are transformed unless their version is 3; the others, unless 0.
    const version = flags >> 6;
    const transformed = tag === 10 || tag === 11 ? version !== 3 : version !== 0;
    const stored = transformed ? base128(woff2, at) : length;
    if (tag === 0) cmap = { start, length: stored };
    start += stored;
  }
  if (!cmap) throw new Error('no cmap table');
  const data = brotliDecompressSync(woff2.subarray(at.offset, at.offset + compressed));
  return data.subarray(cmap.start, cmap.start + cmap.length);
}

/** The characters a `cmap` maps to a glyph, from its Windows Unicode subtable (format 4). */
function charactersOf(cmap: Buffer): Set<number> {
  for (let record = 0; record < cmap.readUInt16BE(2); record++) {
    const entry = 4 + record * 8;
    const offset = cmap.readUInt32BE(entry + 4);
    const windowsUnicode = cmap.readUInt16BE(entry) === 3 && cmap.readUInt16BE(entry + 2) === 1;
    if (!windowsUnicode || cmap.readUInt16BE(offset) !== 4) continue;
    const segments = cmap.readUInt16BE(offset + 6) / 2;
    const ends = offset + 14;
    const starts = ends + segments * 2 + 2;
    const deltas = starts + segments * 2;
    const ranges = deltas + segments * 2;
    const characters = new Set<number>();
    for (let segment = 0; segment < segments; segment++) {
      const first = cmap.readUInt16BE(starts + segment * 2);
      const last = cmap.readUInt16BE(ends + segment * 2);
      const delta = cmap.readInt16BE(deltas + segment * 2);
      const range = cmap.readUInt16BE(ranges + segment * 2);
      for (let code = first; code <= last && code !== 0xffff; code++) {
        const indexed =
          range === 0 ? code : cmap.readUInt16BE(ranges + segment * 2 + range + (code - first) * 2);
        const glyph = range !== 0 && indexed === 0 ? 0 : (indexed + delta) & 0xffff;
        if (glyph !== 0) characters.add(code);
      }
    }
    return characters;
  }
  throw new Error('no Windows Unicode cmap of format 4');
}

const CSS = file('src/styles/russian.css').toString('utf8');

/** The `unicode-range` spans of each face of a family in russian.css. */
const rangesOf = (family: string) =>
  [...CSS.matchAll(/@font-face\s*{([^}]*)}/g)]
    .map((face) => face[1]!)
    .filter((face) => face.includes(`font-family: '${family}';`))
    .map((face) =>
      [
        .../unicode-range:([^;]*);/.exec(face)![1]!.matchAll(/U\+([0-9A-F]+)(?:-([0-9A-F]+))?/gi),
      ].map(([, from, to]) => [parseInt(from!, 16), parseInt(to ?? from!, 16)] as const),
    );

const holds = (face: readonly (readonly [number, number])[], code: number) =>
  face.some(([from, to]) => code >= from && code <= to);

type Tree = { readonly [key: string]: string | Tree };
const messages = (tree: Tree): string[] =>
  Object.values(tree).flatMap((value) => (typeof value === 'string' ? [value] : messages(value)));

/** What the Russian copy shows: its placeholders and plural bars are not drawn. */
const SHOWN = new Map<number, string>();
for (const message of messages(JSON.parse(file('src/i18n/locales/ru.json').toString('utf8')))) {
  for (const character of message.replace(/\{\w+\}/g, '').replace(/\s*\|\s*/g, ' ')) {
    const code = character.codePointAt(0)!;
    if (code >= 0x20 && !SHOWN.has(code)) SHOWN.set(code, message);
  }
}

const hex = (code: number) =>
  `U+${code.toString(16).toUpperCase().padStart(4, '0')} in "${SHOWN.get(code)!.slice(0, 40)}"`;

describe('the Russian face', () => {
  const cut = charactersOf(cmapOf(file('src/assets/fonts/nunito-russian-wght.woff2')));
  const faces = rangesOf('Ballmania Russian');

  it('has a glyph for every character of the Russian copy, soft hyphens included', () => {
    expect([...SHOWN.keys()].filter((code) => !cut.has(code)).map(hex)).toEqual([]);
  });

  it('declares every character of the Russian copy in its unicode-range', () => {
    expect(faces).toHaveLength(3);
    const missing = [...SHOWN.keys()].filter((code) => !faces.every((face) => holds(face, code)));
    expect(missing.map(hex)).toEqual([]);
  });

  it('keeps soft hyphens out of the faces the other languages fall back on', () => {
    // Fredoka has no U+00AD either: WebKit and Firefox look further down the stack for the
    // soft hyphens of "Obser­vatory", and a face declaring it would download Nunito (v1.9.0).
    for (const family of ['Ballmania Cyrillic', 'Ballmania Russian Display']) {
      expect(rangesOf(family).length, family).toBeGreaterThan(0);
      expect(
        rangesOf(family).some((face) => holds(face, 0x00ad)),
        family,
      ).toBe(false);
    }
    const defaults = /:root\s*{([^}]*)}/.exec(file('src/styles/tokens.css').toString('utf8'))![1]!;
    expect(defaults).toContain("'Ballmania Cyrillic'");
    expect(defaults).not.toContain("'Ballmania Russian'");
  });

  it('sets the Russian text in its own face, with no web face behind it', () => {
    // With Fredoka behind it, WebKit downloaded Fredoka 700 all the same (v1.9.0): the cut
    // holds the whole copy, so the stack goes straight on to the system's faces.
    const tokens = file('src/styles/tokens.css').toString('utf8');
    const russian = /:root:lang\(ru\)\s*{([^}]*)}/.exec(tokens)![1]!;
    const stack = /--font-ui:([^;]*);/.exec(russian)![1]!.trim();
    expect(stack.startsWith("'Ballmania Russian',")).toBe(true);
    expect(stack).not.toContain('Fredoka');
  });
});
