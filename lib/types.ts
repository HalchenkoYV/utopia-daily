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

// Answers of /api/translate and /api/word-family.
export type TranslateResult = {
  translation: string;
  base_form: string;
  part_of_speech: string;
  definition: string;
  /** Piece of the sentence around the word, e.g. "on the edge of town" (empty without a sentence). */
  context_phrase: string;
  /** That piece as it reads in a translation of the sentence, e.g. "на окраине города". */
  context_translation: string;
};

export type FamilyWord = {
  word: string;
  part_of_speech: string;
  translation: string;
  definition: string;
};

// Everything the story page needs in the browser to switch levels instantly.
export type StoryView = {
  date: string;
  n: number;
  topic: Topic;
  thumb: string;
  levels: Record<
    Level,
    {
      title: string;
      excerpt: string;
      paragraphs: string[];
      vocab: VocabItem[];
      minutes: number;
      words: number;
    }
  >;
};
