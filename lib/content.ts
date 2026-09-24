// Server-only: reads story JSON files from content/YYYY-MM-DD/story-N.json.
import fs from "node:fs";
import path from "node:path";
import { LEVELS, TOPICS, TOPIC_THUMB, countWords, readingMinutes, type Level } from "./levels";
import type { DaySummary, LevelContent, Story, StoryFile, StorySummary, StoryView } from "./types";

const CONTENT_DIR = path.join(process.cwd(), "content");
const DATE_DIR = /^\d{4}-\d{2}-\d{2}$/;
const STORY_FILE = /^story-(\d+)\.json$/;

function isLevelContent(value: unknown): value is LevelContent {
  const v = value as LevelContent;
  return (
    !!v &&
    typeof v.title === "string" &&
    typeof v.excerpt === "string" &&
    typeof v.body === "string" &&
    Array.isArray(v.vocab)
  );
}

function isStoryFile(value: unknown): value is StoryFile {
  const v = value as StoryFile;
  return (
    !!v &&
    (v.status === "draft" || v.status === "published") &&
    (TOPICS as readonly string[]).includes(v.topic_category) &&
    !!v.levels &&
    LEVELS.every((lvl) => isLevelContent(v.levels[lvl]))
  );
}

function readStory(date: string, file: string): Story | null {
  const match = STORY_FILE.exec(file);
  if (!match) return null;
  const fullPath = path.join(CONTENT_DIR, date, file);
  try {
    const data: unknown = JSON.parse(fs.readFileSync(fullPath, "utf8"));
    if (!isStoryFile(data)) {
      console.warn(`[content] Skipping invalid story file: ${date}/${file}`);
      return null;
    }
    if (data.status !== "published") return null;
    return { date, n: Number(match[1]), topic: data.topic_category, levels: data.levels };
  } catch (err) {
    console.warn(`[content] Could not read ${date}/${file}:`, err);
    return null;
  }
}

/** All published stories, newest day first, then story-1..story-6. */
export function getPublishedStories(): Story[] {
  if (!fs.existsSync(CONTENT_DIR)) return [];
  const dates = fs
    .readdirSync(CONTENT_DIR)
    .filter((name) => DATE_DIR.test(name))
    .sort()
    .reverse();

  return dates.flatMap(getDayStories);
}

/** One published story, or null. Params come from the URL, so they are validated before touching the disk. */
export function getStory(date: string, n: string | number): Story | null {
  const num = String(n);
  if (!DATE_DIR.test(date) || !/^\d{1,2}$/.test(num)) return null;
  return readStory(date, `story-${Number(num)}.json`);
}

/** All published stories of one day, story-1 first. */
export function getDayStories(date: string): Story[] {
  if (!DATE_DIR.test(date)) return [];
  const dir = path.join(CONTENT_DIR, date);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .map((file) => readStory(date, file))
    .filter((s): s is Story => s !== null)
    .sort((a, b) => a.n - b.n);
}

/** Published stories grouped by day, newest first. Days with no published stories are skipped. */
export function getDays(): { date: string; stories: Story[] }[] {
  const byDate = new Map<string, Story[]>();
  for (const story of getPublishedStories()) {
    const list = byDate.get(story.date) ?? [];
    list.push(story);
    byDate.set(story.date, list);
  }
  return [...byDate.entries()].map(([date, stories]) => ({ date, stories }));
}

export function toSummary(story: Story): StorySummary {
  const levels = {} as StorySummary["levels"];
  for (const lvl of LEVELS as readonly Level[]) {
    const c = story.levels[lvl];
    levels[lvl] = { title: c.title, excerpt: c.excerpt, minutes: readingMinutes(c.body, lvl) };
  }
  return { date: story.date, n: story.n, topic: story.topic, thumb: TOPIC_THUMB[story.topic], levels };
}

export function toStoryView(story: Story): StoryView {
  const levels = {} as StoryView["levels"];
  for (const lvl of LEVELS as readonly Level[]) {
    const c = story.levels[lvl];
    levels[lvl] = {
      title: c.title,
      excerpt: c.excerpt,
      paragraphs: c.body
        .split(/\n\s*\n/)
        .map((p) => p.trim())
        .filter(Boolean),
      minutes: readingMinutes(c.body, lvl),
      words: countWords(c.body),
    };
  }
  return { date: story.date, n: story.n, topic: story.topic, thumb: TOPIC_THUMB[story.topic], levels };
}

export function toDaySummary(day: { date: string; stories: Story[] }): DaySummary {
  return { date: day.date, stories: day.stories.map(toSummary) };
}
