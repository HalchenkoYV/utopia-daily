import type { Level, Topic } from "./levels";

export type VocabItem = { word: string; definition: string };

export type LevelContent = {
  title: string;
  excerpt: string;
  body: string;
  vocab: VocabItem[];
};

// Shape of content/YYYY-MM-DD/story-N.json
export type StoryFile = {
  status: "draft" | "published";
  topic_category: Topic;
  levels: Record<Level, LevelContent>;
};

export type Story = {
  date: string; // YYYY-MM-DD
  n: number; // 1..6
  topic: Topic;
  levels: Record<Level, LevelContent>;
};

// Lightweight version sent to the browser for cards (no full text).
export type StorySummary = {
  date: string;
  n: number;
  topic: Topic;
  thumb: string;
  levels: Record<Level, { title: string; excerpt: string; minutes: number }>;
};

export type DaySummary = { date: string; stories: StorySummary[] };
