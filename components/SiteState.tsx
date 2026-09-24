"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { DEFAULT_LEVEL, isLevel, type Level } from "@/lib/levels";

// Global UI state shared by the header, the feed and the My Words panel.
// Guests keep their level in localStorage; for logged-in users Account.tsx syncs it with their profile.

const LEVEL_KEY = "ud-level";
const WORDS_OPEN_KEY = "ud-words-open";

type SiteState = {
  level: Level;
  /** The reader picked a level (header buttons). */
  setLevel: (level: Level) => void;
  /** Level loaded from somewhere else (the account profile) — not counted as a pick. */
  applyLevel: (level: Level) => void;
  /** True once the saved level has been read from storage (always false during server render). */
  levelRestored: boolean;
  /** Increments every time the reader picks a level in the header — lets pages react to real clicks only. */
  levelPicks: number;
  wordsOpen: boolean;
  toggleWords: () => void;
};

const SiteStateContext = createContext<SiteState | null>(null);

function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // private mode / storage blocked — the choice just won't be remembered
  }
}

export function SiteStateProvider({ children }: { children: ReactNode }) {
  const [level, setLevelState] = useState<Level>(DEFAULT_LEVEL);
  const [levelRestored, setLevelRestored] = useState(false);
  const [levelPicks, setLevelPicks] = useState(0);
  const [wordsOpen, setWordsOpen] = useState(true);

  // Restore saved choices after hydration (server render always uses the defaults).
  useEffect(() => {
    const savedLevel = readStorage(LEVEL_KEY);
    if (isLevel(savedLevel)) setLevelState(savedLevel);
    setLevelRestored(true);
    if (readStorage(WORDS_OPEN_KEY) === "0") setWordsOpen(false);
  }, []);

  const setLevel = useCallback((next: Level) => {
    setLevelState(next);
    setLevelPicks((n) => n + 1);
    writeStorage(LEVEL_KEY, next);
  }, []);

  const applyLevel = useCallback((next: Level) => {
    setLevelState(next);
    writeStorage(LEVEL_KEY, next);
  }, []);

  const toggleWords = useCallback(() => {
    setWordsOpen((open) => {
      writeStorage(WORDS_OPEN_KEY, open ? "0" : "1");
      return !open;
    });
  }, []);

  return (
    <SiteStateContext.Provider
      value={{ level, setLevel, applyLevel, levelRestored, levelPicks, wordsOpen, toggleWords }}
    >
      {children}
    </SiteStateContext.Provider>
  );
}

export function useSiteState(): SiteState {
  const ctx = useContext(SiteStateContext);
  if (!ctx) throw new Error("useSiteState must be used inside <SiteStateProvider>");
  return ctx;
}
