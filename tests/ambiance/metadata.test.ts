import { describe, expect, it } from 'vitest';
import { Composer } from '../../marketing/ambiance/Composer';
import {
  chapters,
  DESCRIPTION_LIMIT,
  duration,
  LANGUAGES,
  pinnedComment,
  shortCaption,
  stamp,
  TITLE_LIMIT,
  upload,
  type ChannelCopy,
  type ManifestFacts,
} from '../../marketing/ambiance/Metadata';
import { Mood } from '../../marketing/ambiance/Mood';
import channel from '../../marketing/ambiance/channel.json';
import moods from '../../marketing/ambiance/moods.json';

const copy = channel as unknown as ChannelCopy;
const MOODS = Mood.parseAll(moods);

const facts = (id: string, minutes: number, seed = 1): ManifestFacts => {
  const mood = MOODS.find((m) => m.id === id)!;
  return { mood: { id }, minutes, plan: new Composer(mood).plan(minutes * 60, seed) };
};

const CASES = MOODS.flatMap((m) =>
  [60, 90, 120, 180].flatMap((minutes) => LANGUAGES.map((lang) => [m.id, minutes, lang] as const)),
);

describe('the texts of an upload', () => {
  it('has copy for every mood of the factory', () => {
    expect(Object.keys(copy.moods).sort()).toEqual(MOODS.map((m) => m.id).sort());
  });

  it.each(CASES)('%s, %i min, %s: a title within YouTube’s 100 characters', (id, minutes, lang) => {
    const { title } = upload(facts(id, minutes), copy, lang);
    expect(title.length).toBeLessThanOrEqual(TITLE_LIMIT);
    expect(title).not.toContain('{duration}');
  });

  it.each(CASES)(
    '%s, %i min, %s: a description within 5,000 characters, with the credit, the link and three hashtags',
    (id, minutes, lang) => {
      const { description } = upload(facts(id, minutes), copy, lang);
      expect(description.length).toBeLessThanOrEqual(DESCRIPTION_LIMIT);
      expect(description).toContain(copy.credit[lang]);
      expect(description).toContain(copy.site);
      expect(description.trim().split('\n').at(-1)!.split(' ')).toHaveLength(3);
    },
  );

  it.each(CASES)('%s, %i min, %s: chapters as YouTube reads them', (id, minutes, lang) => {
    const marks = chapters(facts(id, minutes), copy, lang);
    expect(marks.length).toBeGreaterThanOrEqual(3);
    expect(marks[0]!.at).toBe(0);
    for (let i = 1; i < marks.length; i++) {
      expect(marks[i]!.at - marks[i - 1]!.at).toBeGreaterThanOrEqual(10);
      expect(marks[i]!.label).not.toBe(marks[i - 1]!.label);
    }
  });

  it('never names Yandex, anywhere', () => {
    const everything = JSON.stringify(channel).toLowerCase();
    expect(everything).not.toContain('yandex');
    expect(everything).not.toContain('яндекс');
  });

  it('says what is true: no generative AI, no samples, in both languages', () => {
    expect(copy.credit.en).toMatch(/no generative AI/);
    expect(copy.credit.fr).toMatch(/sans IA générative/);
  });

  it('writes French with a no-break space before the high punctuation', () => {
    const french = JSON.stringify(channel, (key, value: unknown) =>
      key === 'en' ? undefined : value,
    );
    expect(french).not.toMatch(/ [:;!?]/);
  });

  it('writes durations and time stamps as people read them', () => {
    expect(duration(copy, 60, 'en')).toBe('1 Hour');
    expect(duration(copy, 180, 'fr')).toBe('3 heures');
    expect(duration(copy, 90, 'en')).toBe('90 Minutes');
    expect(stamp(0)).toBe('0:00');
    expect(stamp(222.1)).toBe('3:42');
    expect(stamp(3725)).toBe('1:02:05');
  });

  it('points a Short to the full video and asks for nothing in return', () => {
    const caption = shortCaption(facts('abyss-sleep', 60), copy, 'en');
    expect(caption).toContain(`Full 1-hour version on ${copy.handle}.`);
    expect(shortCaption(facts('abyss-sleep', 90), copy, 'en')).toContain('Full 90-minute version');
    expect(caption.toLowerCase()).not.toMatch(/comment|like and|subscribe/);
    expect(pinnedComment(copy, 'fr')).toContain(copy.site);
  });
});
