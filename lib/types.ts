import type { Level, Topic } from "./levels";

export type VocabItem = { word: string; definition: string };

export type LevelContent = {
  title: string;
  excerpt: string;
  body: string;
  vocab: VocabItem[];
  /** 1–2 sentences about the real world (September 2026), written at this level. */
  reality_check: string;
};

/** An illustration stored with the story: SVG markup drawn when the story was written. */
export type StoryImage = {
  svg: string;
  alt: string;
  caption: string;
  placement: "hero" | "inline";
  /** Inline drawings only: where in the text they go, from 0 (top) to 1 (end). */
  position: number;
};

/** One story as stored in the `stories` table (all six levels present). */
export type Story = {
  date: string; // YYYY-MM-DD
  n: number; // 1..9 = rubric number
  topic: Topic;
  timelineDay: number;
  dateline: string;
  realitySource: string | null;
  images: StoryImage[];
  levels: Record<Level, LevelContent>;
};

/** A drawing ready for the browser: served by /img/[date]/[n]/[i]. */
export type Picture = { src: string; alt: string; caption: string; position: number };

// Lightweight version sent to the browser for cards (no full text).
export type StorySummary = {
  date: string;
  n: number;
  topic: Topic;
  thumb: string;
  timelineDay: number;
  hero: Picture | null;
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
  timelineDay: number;
  dateline: string;
  realitySource: string | null;
  hero: Picture | null;
  figures: Picture[];
  levels: Record<
    Level,
    {
      title: string;
      excerpt: string;
      paragraphs: string[];
      vocab: VocabItem[];
      realityCheck: string;
      minutes: number;
      words: number;
    }
  >;
};
