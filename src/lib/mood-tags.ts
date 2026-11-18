/**
 * What shaped a day, stored inside the mood note as stable hashtags ("#sleep #work") so it
 * needs no schema change. The keys never change with the language; the UI translates them.
 */
export const MOOD_TAGS = ["sleep", "work", "sport", "friends", "family", "love", "food", "nature", "rest", "stress", "health", "weather"] as const;
export type MoodTag = (typeof MOOD_TAGS)[number];

const TAG_PATTERN = new RegExp(`(^|\\s)#(${MOOD_TAGS.join("|")})(?=\\s|$)`, "g");

export function isMoodTag(value: string): value is MoodTag {
  return (MOOD_TAGS as readonly string[]).includes(value);
}

/** Splits a stored note into the free text and the known tags, in their canonical order. */
export function parseMoodNote(notes: string | null | undefined): { text: string; tags: MoodTag[] } {
  if (!notes) return { text: "", tags: [] };
  const found = new Set<MoodTag>();
  const text = notes.replace(TAG_PATTERN, (_match, lead: string, tag: string) => {
    if (isMoodTag(tag)) found.add(tag);
    return lead;
  }).replace(/\s+/g, " ").trim();
  return { text, tags: MOOD_TAGS.filter((tag) => found.has(tag)) };
}

/** The note to store: the free text, then the tags. Null when both are empty. */
export function composeMoodNote(text: string, tags: readonly string[]): string | null {
  const known = MOOD_TAGS.filter((tag) => tags.includes(tag));
  const body = [text.trim(), known.map((tag) => `#${tag}`).join(" ")].filter(Boolean).join(" ");
  return body || null;
}

type Entry = { entry_date: string; mood_score: number; energy_level: number; notes: string | null };

/**
 * Average mood on days carrying each tag, against the average of all tagged-or-not days.
 * Only tags seen on at least `minDays` days are returned, strongest effect first.
 */
export function tagEffects(entries: Entry[], minDays = 3) {
  if (!entries.length) return [];
  const overall = entries.reduce((sum, entry) => sum + entry.mood_score, 0) / entries.length;
  const byTag = new Map<MoodTag, number[]>();
  for (const entry of entries) {
    for (const tag of parseMoodNote(entry.notes).tags) byTag.set(tag, [...(byTag.get(tag) ?? []), entry.mood_score]);
  }
  return [...byTag.entries()]
    .filter(([, scores]) => scores.length >= minDays)
    .map(([tag, scores]) => {
      const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
      return { tag, days: scores.length, average: Math.round(average * 10) / 10, diff: Math.round((average - overall) * 10) / 10 };
    })
    .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff) || b.days - a.days);
}

/** Mean mood and energy for a window of days, and for the same-length window just before it. */
export function comparePeriods(entries: Entry[], today: string, days: number) {
  const shift = (date: string, by: number) => {
    const d = new Date(`${date}T12:00:00`);
    d.setDate(d.getDate() + by);
    return d.toISOString().slice(0, 10);
  };
  const start = shift(today, -(days - 1));
  const previousStart = shift(today, -(2 * days - 1));
  const mean = (rows: Entry[], key: "mood_score" | "energy_level") =>
    rows.length ? Math.round((rows.reduce((sum, row) => sum + row[key], 0) / rows.length) * 10) / 10 : null;
  const current = entries.filter((entry) => entry.entry_date >= start && entry.entry_date <= today);
  const previous = entries.filter((entry) => entry.entry_date >= previousStart && entry.entry_date < start);
  return {
    current: { mood: mean(current, "mood_score"), energy: mean(current, "energy_level"), days: current.length },
    previous: { mood: mean(previous, "mood_score"), energy: mean(previous, "energy_level"), days: previous.length },
  };
}
