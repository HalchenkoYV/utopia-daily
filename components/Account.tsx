"use client";

import type { User } from "@supabase/supabase-js";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { guessLanguage, isLanguage, type LanguageCode } from "@/lib/languages";
import { isLevel, type Level } from "@/lib/levels";
import { getSupabase } from "@/lib/supabase";
import type { FamilyWord, TranslateResult } from "@/lib/types";
import { useSiteState } from "./SiteState";

export type SavedWord = {
  id: string;
  word: string;
  translation: string | null;
  definition: string | null;
  context: string | null; // the sentence the word was saved from
  story_path: string | null; // "2026-09-24/1"
  story_title: string | null;
  level: Level | null;
  related_to: string | null; // set for words added from a word family
  created_at: string;
};

export type NewWord = {
  word: string;
  translation?: string | null;
  definition?: string | null;
  context?: string | null;
  storyPath?: string | null;
  storyTitle?: string | null;
  level?: Level | null;
  relatedTo?: string | null;
};

export type WordEdit = { word: string; translation: string | null; definition: string | null };

type Result<T = void> = { data?: T; error?: string };

type Account = {
  /** False until Supabase keys are set in the environment. */
  configured: boolean;
  /** True once we know whether someone is logged in. */
  ready: boolean;
  user: User | null;
  words: SavedWord[];
  hasWord: (word: string) => boolean;
  saveWord: (word: NewWord) => Promise<Result>;
  updateWord: (id: string, edit: WordEdit) => Promise<Result>;
  deleteWord: (id: string) => Promise<Result>;
  /** Language for translations; null until the reader picks one (or the browser suggests one). */
  translateTo: LanguageCode | null;
  setTranslateTo: (code: LanguageCode) => void;
  translate: (text: string, sentence: string | null, level: Level | null) => Promise<Result<TranslateResult>>;
  wordFamily: (word: string) => Promise<Result<FamilyWord[]>>;
  signOut: () => Promise<void>;
};

const WORD_COLUMNS =
  "id, word, translation, definition, context, story_path, story_title, level, related_to, created_at";
const LANG_KEY = "ud-translate-to";

const AccountContext = createContext<Account | null>(null);

export function normalizeWord(word: string): string {
  return word.trim().replace(/\s+/g, " ").toLowerCase().replace(/’/g, "'");
}

function nullIfEmpty(value: string | null | undefined): string | null {
  const v = value?.trim();
  return v ? v : null;
}

export function AccountProvider({ children }: { children: ReactNode }) {
  const supabase = getSupabase();
  const { level, levelPicks, applyLevel } = useSiteState();
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(!supabase);
  const [words, setWords] = useState<SavedWord[]>([]);
  const [translateTo, setTranslateToState] = useState<LanguageCode | null>(null);
  const translations = useRef(new Map<string, TranslateResult>());
  const userId = user?.id ?? null;

  // Guest default for the translation language: saved choice, else the browser language.
  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = window.localStorage.getItem(LANG_KEY);
    } catch {}
    setTranslateToState(isLanguage(saved) ? saved : guessLanguage(navigator.languages ?? [navigator.language]));
  }, []);

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

  // Logged in: load the profile (level, language) and the word list.
  useEffect(() => {
    if (!supabase || !userId) {
      setWords([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const [profile, list] = await Promise.all([
        supabase.from("profiles").select("level, translate_to").eq("id", userId).maybeSingle(),
        supabase.from("saved_words").select(WORD_COLUMNS).order("created_at", { ascending: false }),
      ]);
      if (cancelled) return;
      const savedLevel = profile.data?.level;
      if (isLevel(savedLevel)) applyLevel(savedLevel);
      const savedLang = profile.data?.translate_to;
      if (isLanguage(savedLang)) setTranslateToState(savedLang);
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

  const setTranslateTo = useCallback(
    (code: LanguageCode) => {
      setTranslateToState(code);
      try {
        window.localStorage.setItem(LANG_KEY, code);
      } catch {}
      if (supabase && userId) {
        supabase
          .from("profiles")
          .upsert({ id: userId, translate_to: code })
          .then(({ error }) => {
            if (error) console.warn("[account] Could not save language:", error.message);
          });
      }
    },
    [supabase, userId],
  );

  const hasWord = useCallback((word: string) => words.some((w) => w.word === normalizeWord(word)), [words]);

  const saveWord = useCallback(
    async (item: NewWord): Promise<Result> => {
      if (!supabase || !userId) return { error: "Please log in to save words." };
      const word = normalizeWord(item.word);
      if (!word) return { error: "Please type a word." };
      if (word.length > 64) return { error: "That is too long for one word or phrase." };
      if (words.some((w) => w.word === word)) return { error: "This word is already in My Words." };
      const { data, error } = await supabase
        .from("saved_words")
        .insert({
          word,
          translation: nullIfEmpty(item.translation),
          definition: nullIfEmpty(item.definition),
          context: nullIfEmpty(item.context)?.slice(0, 600) ?? null,
          story_path: item.storyPath ?? null,
          story_title: item.storyTitle ?? null,
          level: item.level ?? null,
          related_to: item.relatedTo ? normalizeWord(item.relatedTo) : null,
        })
        .select(WORD_COLUMNS)
        .single();
      if (error) {
        if (error.code === "23505") return { error: "This word is already in My Words." };
        return { error: "Could not save the word. Please try again." };
      }
      setWords((list) => [data as SavedWord, ...list]);
      return {};
    },
    [supabase, userId, words],
  );

  const updateWord = useCallback(
    async (id: string, edit: WordEdit): Promise<Result> => {
      if (!supabase || !userId) return { error: "Please log in." };
      const word = normalizeWord(edit.word);
      if (!word) return { error: "The word can’t be empty." };
      if (word.length > 64) return { error: "That is too long for one word or phrase." };
      const { data, error } = await supabase
        .from("saved_words")
        .update({
          word,
          translation: nullIfEmpty(edit.translation),
          definition: nullIfEmpty(edit.definition),
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select(WORD_COLUMNS)
        .single();
      if (error) {
        if (error.code === "23505") return { error: "You already have this word in My Words." };
        return { error: "Could not save your changes. Please try again." };
      }
      setWords((list) => list.map((w) => (w.id === id ? (data as SavedWord) : w)));
      return {};
    },
    [supabase, userId],
  );

  const deleteWord = useCallback(
    async (id: string): Promise<Result> => {
      if (!supabase || !userId) return { error: "Please log in." };
      const { error } = await supabase.from("saved_words").delete().eq("id", id);
      if (error) return { error: "Could not delete the word. Please try again." };
      setWords((list) => list.filter((w) => w.id !== id));
      return {};
    },
    [supabase, userId],
  );

  // Calls our own API routes (which call Gemini) with the reader's session token.
  const callAi = useCallback(
    async <T,>(path: string, body: object): Promise<Result<T>> => {
      if (!supabase || !userId) return { error: "Please log in first." };
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) return { error: "Please log in again." };
      try {
        const res = await fetch(path, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(body),
        });
        const payload = await res.json().catch(() => ({}));
        if (!res.ok) {
          const message = payload.error ?? "Something went wrong. Please try again.";
          // The short code (e.g. "gemini_PERMISSION_DENIED") helps with support; it contains no secrets.
          return { error: payload.code ? `${message} (code: ${payload.code})` : message };
        }
        return { data: payload as T };
      } catch {
        return { error: "No connection. Please check your internet and try again." };
      }
    },
    [supabase, userId],
  );

  const translate = useCallback(
    async (text: string, sentence: string | null, lvl: Level | null): Promise<Result<TranslateResult>> => {
      if (!translateTo) return { error: "Choose a language for translations first." };
      const key = `${translateTo}|${normalizeWord(text)}|${sentence ?? ""}`;
      const cached = translations.current.get(key);
      if (cached) return { data: cached };
      const result = await callAi<TranslateResult>("/api/translate", {
        text,
        sentence,
        lang: translateTo,
        level: lvl,
      });
      if (result.data) translations.current.set(key, result.data);
      return result;
    },
    [callAi, translateTo],
  );

  const wordFamily = useCallback(
    async (word: string): Promise<Result<FamilyWord[]>> => {
      if (!translateTo) return { error: "Choose a language for translations first." };
      const result = await callAi<{ words: FamilyWord[] }>("/api/word-family", { word, lang: translateTo });
      return result.data ? { data: result.data.words } : { error: result.error };
    },
    [callAi, translateTo],
  );

  const signOut = useCallback(async () => {
    await supabase?.auth.signOut();
  }, [supabase]);

  return (
    <AccountContext.Provider
      value={{
        configured: !!supabase,
        ready,
        user,
        words,
        hasWord,
        saveWord,
        updateWord,
        deleteWord,
        translateTo,
        setTranslateTo,
        translate,
        wordFamily,
        signOut,
      }}
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
