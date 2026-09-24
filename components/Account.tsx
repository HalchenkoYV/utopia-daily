"use client";

import type { User } from "@supabase/supabase-js";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { isLevel, type Level } from "@/lib/levels";
import { getSupabase } from "@/lib/supabase";
import { useSiteState } from "./SiteState";

export type SavedWord = {
  id: string;
  word: string;
  definition: string | null;
  story_path: string | null; // "2026-09-24/1"
  story_title: string | null;
  level: Level | null;
  created_at: string;
};

export type NewWord = {
  word: string;
  definition: string | null;
  storyPath: string;
  storyTitle: string;
  level: Level;
};

type Account = {
  /** False until Supabase keys are set in the environment. */
  configured: boolean;
  /** True once we know whether someone is logged in. */
  ready: boolean;
  user: User | null;
  words: SavedWord[];
  hasWord: (word: string) => boolean;
  saveWord: (word: NewWord) => Promise<{ error?: string }>;
  deleteWord: (id: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
};

const WORD_COLUMNS = "id, word, definition, story_path, story_title, level, created_at";

const AccountContext = createContext<Account | null>(null);

export function normalizeWord(word: string): string {
  return word.trim().toLowerCase().replace(/’/g, "'");
}

export function AccountProvider({ children }: { children: ReactNode }) {
  const supabase = getSupabase();
  const { level, levelPicks, applyLevel } = useSiteState();
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(!supabase);
  const [words, setWords] = useState<SavedWord[]>([]);
  const userId = user?.id ?? null;

  // Session: restored from storage, or picked up from a magic-link / confirmation URL.
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, [supabase]);

  // Logged in: load the profile level and the word list.
  useEffect(() => {
    if (!supabase || !userId) {
      setWords([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const [profile, list] = await Promise.all([
        supabase.from("profiles").select("level").eq("id", userId).maybeSingle(),
        supabase.from("saved_words").select(WORD_COLUMNS).order("created_at", { ascending: false }),
      ]);
      if (cancelled) return;
      const savedLevel = profile.data?.level;
      if (isLevel(savedLevel)) applyLevel(savedLevel);
      setWords((list.data as SavedWord[] | null) ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase, userId, applyLevel]);

  // Logged-in reader picks a level in the header → remember it in the profile.
  const seenPicks = useRef(levelPicks);
  useEffect(() => {
    if (levelPicks === seenPicks.current) return;
    seenPicks.current = levelPicks;
    if (supabase && userId) {
      supabase
        .from("profiles")
        .upsert({ id: userId, level })
        .then(({ error }) => {
          if (error) console.warn("[account] Could not save level:", error.message);
        });
    }
  }, [levelPicks, level, supabase, userId]);

  const hasWord = useCallback((word: string) => words.some((w) => w.word === normalizeWord(word)), [words]);

  const saveWord = useCallback(
    async (item: NewWord) => {
      if (!supabase || !userId) return { error: "Please log in to save words." };
      const word = normalizeWord(item.word);
      if (words.some((w) => w.word === word)) return {};
      const { data, error } = await supabase
        .from("saved_words")
        .insert({
          word,
          definition: item.definition,
          story_path: item.storyPath,
          story_title: item.storyTitle,
          level: item.level,
        })
        .select(WORD_COLUMNS)
        .single();
      if (error) {
        if (error.code === "23505") return {}; // already saved (e.g. in another tab)
        return { error: "Could not save the word. Please try again." };
      }
      setWords((list) => [data as SavedWord, ...list]);
      return {};
    },
    [supabase, userId, words],
  );

  const deleteWord = useCallback(
    async (id: string) => {
      if (!supabase || !userId) return { error: "Please log in." };
      const { error } = await supabase.from("saved_words").delete().eq("id", id);
      if (error) return { error: "Could not delete the word. Please try again." };
      setWords((list) => list.filter((w) => w.id !== id));
      return {};
    },
    [supabase, userId],
  );

  const signOut = useCallback(async () => {
    await supabase?.auth.signOut();
  }, [supabase]);

  return (
    <AccountContext.Provider
      value={{ configured: !!supabase, ready, user, words, hasWord, saveWord, deleteWord, signOut }}
    >
      {children}
    </AccountContext.Provider>
  );
}

export function useAccount(): Account {
  const ctx = useContext(AccountContext);
  if (!ctx) throw new Error("useAccount must be used inside <AccountProvider>");
  return ctx;
}
