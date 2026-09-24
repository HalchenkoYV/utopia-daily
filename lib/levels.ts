// Shared by server and client code — no Node-only imports here.

export const LEVELS = ["a1", "a2", "b1", "b2", "c1"] as const;
export type Level = (typeof LEVELS)[number];

export const DEFAULT_LEVEL: Level = "b1";

export const IELTS_NOTE: Record<Level, string> = {
  a1: "≈ IELTS below 3.5",
  a2: "≈ IELTS 3.5–4.5",
  b1: "≈ IELTS 4.5–5.5",
  b2: "≈ IELTS 5.5–6.5",
  c1: "≈ IELTS 7.0–8.0",
};

export function isLevel(value: unknown): value is Level {
  return typeof value === "string" && (LEVELS as readonly string[]).includes(value);
}

export function levelLabel(level: Level): string {
  return level.toUpperCase();
}

export const TOPICS = ["Environment", "Energy", "Community", "Technology", "Culture", "Food"] as const;
export type Topic = (typeof TOPICS)[number];

// CSS gradient placeholder class per topic (see .thumb.* in globals.css)
export const TOPIC_THUMB: Record<Topic, string> = {
  Environment: "env",
  Energy: "energy",
  Community: "community",
  Technology: "tech",
  Culture: "culture",
  Food: "food",
};

// Learners read slower than native speakers; tuned so that
// B1 (~220 words) ≈ 5 min and C1 (~650 words) ≈ 8 min.
const WORDS_PER_MINUTE: Record<Level, number> = { a1: 40, a2: 45, b1: 50, b2: 65, c1: 85 };

export function countWords(text: string): number {
  return text.split(/\s+/).filter((token) => /[\p{L}\p{N}]/u.test(token)).length;
}

export function readingMinutes(body: string, level: Level): number {
  return Math.max(1, Math.round(countWords(body) / WORDS_PER_MINUTE[level]));
}
