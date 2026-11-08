import type { Shot } from './Composer';

/**
 * The texts of an ambience's upload (specification § 3.18, the channel): the
 * YouTube title and description in English (the default) and in French (a
 * translation added in YouTube Studio), with chapters taken from the plan,
 * the captions of the Shorts and the pinned comment. Pure: the same manifest
 * always gives the same texts. Nothing is published: the user posts them.
 */

export type Language = 'en' | 'fr';
export const LANGUAGES: readonly Language[] = ['en', 'fr'];
type Text = Readonly<Record<Language, string>>;

export interface MoodCopy {
  readonly realm: string;
  readonly title: Text;
  readonly hook: Text;
  readonly scene: Text;
  readonly hashtags: readonly string[];
  readonly short: Text;
}

export interface ChannelCopy {
  readonly name: string;
  readonly handle: string;
  readonly site: string;
  readonly tagline: Text;
  readonly credit: Text;
  readonly play: Text;
  readonly listen: Text;
  readonly chaptersTitle: Text;
  readonly durations: Readonly<
    Record<Language, { readonly minutes: string; readonly hour: string; readonly hours: string }>
  >;
  readonly realms: Readonly<
    Record<string, Readonly<Record<Language, Readonly<Record<Shot, string>>>>>
  >;
  readonly moods: Readonly<Record<string, MoodCopy>>;
}

/** What the texts need from a render's manifest. */
export interface ManifestFacts {
  readonly mood: { readonly id: string };
  readonly minutes: number;
  readonly plan: { readonly sections: readonly { readonly start: number; readonly shot: Shot }[] };
}

export interface Upload {
  readonly title: string;
  readonly description: string;
}

/** YouTube's limits: a title of 100 characters, a description of 5,000. */
export const TITLE_LIMIT = 100;
export const DESCRIPTION_LIMIT = 5000;

/** A time stamp as YouTube reads it: 0:00, 3:42, 1:02:05. */
export function stamp(seconds: number): string {
  const s = Math.floor(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const rest = String(s % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${rest}` : `${m}:${rest}`;
}

const moodCopy = (copy: ChannelCopy, id: string): MoodCopy => {
  const mood = copy.moods[id];
  if (!mood) throw new Error(`No channel copy for mood "${id}"`);
  return mood;
};

/** "1 Hour", "90 Minutes", "2 heures"… */
export function duration(copy: ChannelCopy, minutes: number, language: Language): string {
  const words = copy.durations[language];
  if (minutes % 60 !== 0) return words.minutes.replace('{n}', String(minutes));
  const hours = minutes / 60;
  return hours === 1 ? words.hour : words.hours.replace('{n}', String(hours));
}

/**
 * The chapters: one per section of the plan, named after its camera shot in
 * the mood's realm; two sections in a row with the same name merge, since a
 * chapter must say something new.
 */
export function chapters(
  facts: ManifestFacts,
  copy: ChannelCopy,
  language: Language,
): readonly { readonly at: number; readonly label: string }[] {
  const realm = copy.realms[moodCopy(copy, facts.mood.id).realm];
  if (!realm) throw new Error(`No realm for mood "${facts.mood.id}"`);
  const out: { at: number; label: string }[] = [];
  for (const section of facts.plan.sections) {
    const label = realm[language][section.shot];
    if (out[out.length - 1]?.label === label) continue;
    out.push({ at: out.length === 0 ? 0 : section.start, label });
  }
  return out;
}

export function upload(facts: ManifestFacts, copy: ChannelCopy, language: Language): Upload {
  const mood = moodCopy(copy, facts.mood.id);
  const title = mood.title[language].replace('{duration}', duration(copy, facts.minutes, language));
  const marks = chapters(facts, copy, language);
  const lines = [
    mood.hook[language],
    mood.scene[language],
    '',
    copy.listen[language],
    '',
    ...(marks.length >= 3
      ? [copy.chaptersTitle[language], ...marks.map((c) => `${stamp(c.at)} ${c.label}`), '']
      : []),
    copy.credit[language],
    `${copy.play[language]} ${copy.site}`,
    '',
    mood.hashtags.join(' '),
  ];
  return { title, description: lines.join('\n') };
}

/** A Short's caption: one line, a pointer to the full video, three hashtags. */
export function shortCaption(facts: ManifestFacts, copy: ChannelCopy, language: Language): string {
  const mood = moodCopy(copy, facts.mood.id);
  const hours = facts.minutes / 60;
  const length = facts.minutes % 60 !== 0 ? `${facts.minutes}-minute` : `${hours}-hour`;
  const full =
    language === 'en'
      ? `Full ${length} version on ${copy.handle}.`
      : `La vidéo complète (${duration(copy, facts.minutes, 'fr')}) est sur ${copy.handle}.`;
  return `${mood.short[language]} ${full}\n${mood.hashtags.join(' ')}`;
}

/** The comment pinned under the long video: the credit and the link, nothing asked in return. */
export function pinnedComment(copy: ChannelCopy, language: Language): string {
  return `${copy.credit[language]}\n${copy.play[language]} ${copy.site}`;
}
