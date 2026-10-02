// Server-only: reads published stories from the Supabase `stories` table.
// Stories are written there every day by the scheduled "utopia-daily-issue" task;
// Row Level Security lets the public (anon) key read only published rows.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { LEVELS, TOPIC_THUMB, countWords, isTopic, readingMinutes, type Level } from "./levels";
import type { DaySummary, LevelContent, Picture, Story, StoryImage, StorySummary, StoryView, VocabItem } from "./types";

/** How long a page may serve cached stories before checking the database again. */
export const STORIES_REVALIDATE_SECONDS = 300;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const COLUMNS = "date, n, rubric, timeline_day, dateline, reality_source, levels, images";

type StoryRow = {
  date: string;
  n: number;
  rubric: string;
  timeline_day: number;
  dateline: string | null;
  reality_source: string | null;
  levels: unknown;
  images: unknown;
};

let client: SupabaseClient | null = null;

function db(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  if (!client) {
    client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      // Let Next.js cache the answers, so pages don't hit the database on every view.
      global: {
        fetch: (input: RequestInfo | URL, init?: RequestInit) =>
          fetch(input, { ...init, next: { revalidate: STORIES_REVALIDATE_SECONDS, tags: ["stories"] } }),
      },
    });
  }
  return client;
}

function asVocab(value: unknown): VocabItem[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (v): v is VocabItem => !!v && typeof v.word === "string" && typeof v.definition === "string",
  );
}

function asLevelContent(value: unknown): LevelContent | null {
  const c = value as Partial<LevelContent> | null;
  if (!c || typeof c.title !== "string" || typeof c.excerpt !== "string" || typeof c.body !== "string") return null;
  if (!c.title || !c.body) return null;
  return {
    title: c.title,
    excerpt: c.excerpt,
    body: c.body,
    vocab: asVocab(c.vocab),
    reality_check: typeof c.reality_check === "string" ? c.reality_check : "",
  };
}

function asImages(value: unknown): StoryImage[] {
  if (!Array.isArray(value)) return [];
  const images: StoryImage[] = [];
  value.forEach((raw, i) => {
    const img = raw as Partial<StoryImage> | null;
    if (!img || typeof img.svg !== "string") return;
    images.push({
      svg: img.svg,
      alt: typeof img.alt === "string" ? img.alt : "",
      caption: typeof img.caption === "string" ? img.caption : "",
      placement: img.placement === "inline" || (img.placement !== "hero" && i > 0) ? "inline" : "hero",
      position: typeof img.position === "number" ? Math.min(Math.max(img.position, 0), 1) : 0.5,
    });
  });
  return images;
}

function toStory(row: StoryRow): Story | null {
  if (!isTopic(row.rubric)) return null;
  const raw = row.levels as Record<string, unknown> | null;
  if (!raw) return null;
  const levels = {} as Record<Level, LevelContent>;
  for (const lvl of LEVELS) {
    const content = asLevelContent(raw[lvl]);
    if (!content) return null; // a story is shown only when every level is ready
    levels[lvl] = content;
  }
  return {
    date: row.date,
    n: row.n,
    topic: row.rubric,
    timelineDay: row.timeline_day,
    dateline: row.dateline ?? "",
    realitySource: row.reality_source,
    images: asImages(row.images),
    levels,
  };
}

function rowsToStories(rows: StoryRow[] | null): Story[] {
  return (rows ?? []).map(toStory).filter((s): s is Story => s !== null);
}

/** The newest `maxDays` days that have published stories, newest first, story 1 first. */
export async function getRecentDays(maxDays: number): Promise<{ date: string; stories: Story[] }[]> {
  const supabase = db();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("stories")
    .select(COLUMNS)
    .order("date", { ascending: false })
    .order("n", { ascending: true })
    .limit(maxDays * 12);
  if (error) {
    console.error("[content] Could not load stories:", error.message);
    return [];
  }
  const byDate = new Map<string, Story[]>();
  for (const story of rowsToStories(data as StoryRow[])) {
    if (!byDate.has(story.date) && byDate.size >= maxDays) break;
    const list = byDate.get(story.date) ?? [];
    list.push(story);
    byDate.set(story.date, list);
  }
  return [...byDate.entries()].map(([date, stories]) => ({ date, stories }));
}

/** One published story, or null. Params come from the URL, so they are validated first. */
export async function getStory(date: string, n: string | number): Promise<Story | null> {
  const num = Number(n);
  if (!DATE_RE.test(date) || !Number.isInteger(num) || num < 1 || num > 20) return null;
  const supabase = db();
  if (!supabase) return null;
  const { data, error } = await supabase.from("stories").select(COLUMNS).eq("date", date).eq("n", num).maybeSingle();
  if (error) {
    console.error("[content] Could not load story:", error.message);
    return null;
  }
  return data ? toStory(data as StoryRow) : null;
}

/** All published stories of one day, story 1 first. */
export async function getDayStories(date: string): Promise<Story[]> {
  if (!DATE_RE.test(date)) return [];
  const supabase = db();
  if (!supabase) return [];
  const { data, error } = await supabase.from("stories").select(COLUMNS).eq("date", date).order("n");
  if (error) {
    console.error("[content] Could not load day:", error.message);
    return [];
  }
  return rowsToStories(data as StoryRow[]);
}

/**
 * Drawings are SVG written by the story generator. They are only ever shown through <img>
 * (where scripts never run) and served with a strict CSP, but we still strip anything active.
 */
export function sanitizeSvg(svg: string): string | null {
  const s = svg.trim();
  if (!s.startsWith("<svg") || s.length > 20000) return null;
  if (/<script|<foreignObject|<iframe|<image|<use[^>]+href\s*=\s*["']?https?:|javascript:/i.test(s)) return null;
  const cleaned = s
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\s(?:xlink:)?href\s*=\s*("(?!#)[^"]*"|'(?!#)[^']*')/gi, "");
  return /xmlns\s*=\s*["']http:\/\/www\.w3\.org\/2000\/svg["']/.test(cleaned)
    ? cleaned
    : cleaned.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
}

/** The SVG of drawing number `index` (0 = cover) of a story, cleaned, or null. */
export async function getStoryImage(date: string, n: string | number, index: string | number): Promise<string | null> {
  const i = Number(index);
  if (!Number.isInteger(i) || i < 0 || i > 5) return null;
  const story = await getStory(date, n);
  const image = story?.images[i];
  return image ? sanitizeSvg(image.svg) : null;
}

function pictures(story: Story): { hero: Picture | null; figures: Picture[] } {
  const all = story.images.map((img, i) => ({
    img,
    picture: {
      src: `/img/${story.date}/${story.n}/${i}.svg`,
      alt: img.alt,
      caption: img.caption,
      position: img.position,
    } satisfies Picture,
  }));
  const heroEntry = all.find((x) => x.img.placement === "hero") ?? all[0];
  return {
    hero: heroEntry?.picture ?? null,
    figures: all.filter((x) => x !== heroEntry).map((x) => x.picture),
  };
}

export function toSummary(story: Story): StorySummary {
  const levels = {} as StorySummary["levels"];
  for (const lvl of LEVELS) {
    const c = story.levels[lvl];
    levels[lvl] = { title: c.title, excerpt: c.excerpt, minutes: readingMinutes(c.body, lvl) };
  }
  return {
    date: story.date,
    n: story.n,
    topic: story.topic,
    thumb: TOPIC_THUMB[story.topic],
    timelineDay: story.timelineDay,
    hero: pictures(story).hero,
    levels,
  };
}

export function toStoryView(story: Story): StoryView {
  const levels = {} as StoryView["levels"];
  for (const lvl of LEVELS) {
    const c = story.levels[lvl];
    levels[lvl] = {
      title: c.title,
      excerpt: c.excerpt,
      paragraphs: c.body
        .split(/\n\s*\n/)
        .map((p) => p.trim())
        .filter(Boolean),
      vocab: c.vocab,
      realityCheck: c.reality_check,
      minutes: readingMinutes(c.body, lvl),
      words: countWords(c.body),
    };
  }
  const { hero, figures } = pictures(story);
  return {
    date: story.date,
    n: story.n,
    topic: story.topic,
    thumb: TOPIC_THUMB[story.topic],
    timelineDay: story.timelineDay,
    dateline: story.dateline,
    realitySource: story.realitySource,
    hero,
    figures,
    levels,
  };
}

export function toDaySummary(day: { date: string; stories: Story[] }): DaySummary {
  return { date: day.date, stories: day.stories.map(toSummary) };
}
