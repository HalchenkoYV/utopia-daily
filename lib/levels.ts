// Shared by server and client code — no Node-only imports here.

export const LEVELS = ["a1", "a2", "b1", "b2", "c1", "native"] as const;
export type Level = (typeof LEVELS)[number];

export const DEFAULT_LEVEL: Level = "b1";

export const IELTS_NOTE: Record<Level, string> = {
  a1: "≈ IELTS below 3.5",
  a2: "≈ IELTS 3.5–4.5",
  b1: "≈ IELTS 4.5–5.5",
  b2: "≈ IELTS 5.5–6.5",
  c1: "≈ IELTS 7.0–8.0",
  native: "≈ IELTS 8.5–9 · native level",
};

export function isLevel(value: unknown): value is Level {
  return typeof value === "string" && (LEVELS as readonly string[]).includes(value);
}

export function levelLabel(level: Level): string {
  return level === "native" ? "Native" : level.toUpperCase();
}

/** How a level is named inside AI prompts. */
export function levelForPrompt(level: Level): string {
  return level === "native" ? "C2 (native-like)" : level.toUpperCase();
}

// Rubrics of the Utopia Timeline. The order is the story number in a day (story 1 = Politics & Peace).
export const TOPICS = [
  "Politics & Peace",
  "Health",
  "Mind",
  "Society",
  "Food & Land",
  "Planet & Energy",
  "Technology & AI",
  "Economy & Work",
  "Culture & Sport",
] as const;
export type Topic = (typeof TOPICS)[number];

export function isTopic(value: unknown): value is Topic {
  return typeof value === "string" && (TOPICS as readonly string[]).includes(value);
}

// CSS gradient placeholder class per rubric (see .thumb.* in globals.css), used when a story has no drawing.
export const TOPIC_THUMB: Record<Topic, string> = {
  "Politics & Peace": "politics",
  Health: "health",
  Mind: "mind",
  Society: "society",
  "Food & Land": "food",
  "Planet & Energy": "planet",
  "Technology & AI": "tech",
  "Economy & Work": "economy",
  "Culture & Sport": "culture",
};

// Learners read slower than native speakers; tuned so that
// B1 (~220 words) ≈ 5 min, C1 (~650 words) ≈ 8 min and Native (~1,050 words) ≈ 9 min.
const WORDS_PER_MINUTE: Record<Level, number> = { a1: 40, a2: 45, b1: 50, b2: 65, c1: 85, native: 120 };

export function countWords(text: string): number {
  return text.split(/\s+/).filter((token) => /[\p{L}\p{N}]/u.test(token)).length;
}

export function readingMinutes(body: string, level: Level): number {
  return Math.max(1, Math.round(countWords(body) / WORDS_PER_MINUTE[level]));
}
