"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type MouseEvent, type Ref } from "react";
import { createPortal } from "react-dom";
import type { Level } from "@/lib/levels";
import type { TranslateResult, VocabItem } from "@/lib/types";
import { normalizeWord, useAccount } from "./Account";
import LanguageSelect from "./LanguageSelect";

type Props = {
  paragraphs: string[];
  vocab: VocabItem[];
  level: Level;
  storyPath: string; // "2026-09-24/1"
  storyTitle: string;
};

type VocabEntry = { word: string; definition: string; parts: string[] };
type Token = { text: string; start: number; key?: string; vocab?: VocabEntry };

// Letters with optional inner apostrophes: "don't", "Rosa's". Numbers and punctuation stay plain text.
const WORD_RE = /[\p{L}\p{M}]+(?:['’][\p{L}\p{M}]+)*/gu;
const POPOVER_WIDTH = 300;
const MAX_SELECTION_CHARS = 60;
const MAX_SELECTION_WORDS = 6;

function tokenize(paragraph: string, entries: VocabEntry[]): Token[] {
  const tokens: Token[] = [];
  let last = 0;
  for (const m of paragraph.matchAll(WORD_RE)) {
    const start = m.index ?? 0;
    if (start > last) tokens.push({ text: paragraph.slice(last, start), start: last });
    tokens.push({ text: m[0], start, key: normalizeWord(m[0]) });
    last = start + m[0].length;
  }
  if (last < paragraph.length) tokens.push({ text: paragraph.slice(last), start: last });

  // Mark vocab words, including multi-word entries like "look after".
  const words = tokens.filter((t) => t.key);
  for (const entry of entries) {
    const n = entry.parts.length;
    for (let i = 0; i + n <= words.length; i++) {
      if (entry.parts.every((part, j) => words[i + j].key === part)) {
        for (let j = 0; j < n; j++) words[i + j].vocab ??= entry;
      }
    }
  }
  return tokens;
}

/** The sentence of `paragraph` that contains character `offset` — sent to the translator as context. */
function sentenceAt(paragraph: string, offset: number): string {
  for (const m of paragraph.matchAll(/[^.!?…]+(?:[.!?…]+["”’)\]]*|$)/g)) {
    const start = m.index ?? 0;
    if (offset >= start && offset < start + m[0].length) return m[0].trim().slice(0, 600);
  }
  return paragraph.slice(0, 600);
}

type Selected = {
  paragraph: number;
  token: number; // -1 when the reader selected several words with the mouse
  word: string;
  definition: string | null; // from the story vocab
  sentence: string;
  top: number;
  left: number;
};

function popoverPosition(rect: DOMRect) {
  const viewport = document.documentElement.clientWidth;
  const left = Math.min(Math.max(rect.left + rect.width / 2 - POPOVER_WIDTH / 2, 12), viewport - POPOVER_WIDTH - 12);
  return { top: rect.bottom + window.scrollY + 8, left: Math.max(left, 12) + window.scrollX };
}

export default function StoryText({ paragraphs, vocab, level, storyPath, storyTitle }: Props) {
  const [selected, setSelected] = useState<Selected | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  const entries = useMemo<VocabEntry[]>(
    () => vocab.map((v) => ({ word: v.word, definition: v.definition, parts: normalizeWord(v.word).split(" ") })),
    [vocab],
  );
  const parsed = useMemo(() => paragraphs.map((p) => tokenize(p, entries)), [paragraphs, entries]);

  // Close on level change, Escape, resize or a click outside the popover.
  useEffect(() => setSelected(null), [level]);
  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSelected(null);
    const onDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement;
      if (popoverRef.current?.contains(target) || target.closest?.(".story-body")) return;
      setSelected(null);
    };
    const onResize = () => setSelected(null);
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
      window.removeEventListener("resize", onResize);
    };
  }, [selected]);

  // Several words selected with the mouse (or a long press on a phone) → translate the phrase.
  function openFromSelection() {
    const sel = window.getSelection();
    const body = bodyRef.current;
    if (!sel || sel.isCollapsed || sel.rangeCount === 0 || !body) return false;
    const range = sel.getRangeAt(0);
    if (!body.contains(range.commonAncestorContainer)) return false;
    const text = sel
      .toString()
      .replace(/\s+/g, " ")
      .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
    if (!text || text.length > MAX_SELECTION_CHARS || text.split(" ").length > MAX_SELECTION_WORDS) return false;

    const startEl = range.startContainer.parentElement;
    const p = startEl?.closest("p");
    const pi = p ? Array.from(body.querySelectorAll(":scope > p")).indexOf(p) : -1;
    if (!p || pi < 0) return false;
    const before = document.createRange();
    before.setStart(p, 0);
    before.setEnd(range.startContainer, range.startOffset);
    const offset = before.toString().length;

    const vocabMatch = entries.find((e) => normalizeWord(e.word) === normalizeWord(text));
    setSelected({
      paragraph: pi,
      token: -1,
      word: vocabMatch ? vocabMatch.word : normalizeWord(text),
      definition: vocabMatch?.definition ?? null,
      sentence: sentenceAt(paragraphs[pi], offset),
      ...popoverPosition(range.getBoundingClientRect()),
    });
    return true;
  }

  function handleClick(e: MouseEvent<HTMLDivElement>) {
    // A drag-selection also ends with a click — let the selection win.
    const sel = window.getSelection();
    if (sel && !sel.isCollapsed && sel.toString().trim()) return;

    const span = (e.target as HTMLElement).closest<HTMLElement>(".w");
    if (!span) {
      setSelected(null);
      return;
    }
    const p = Number(span.dataset.p);
    const t = Number(span.dataset.t);
    const token = parsed[p]?.[t];
    if (!token?.key) return;
    if (selected?.paragraph === p && selected.token === t) {
      setSelected(null);
      return;
    }
    setSelected({
      paragraph: p,
      token: t,
      word: token.vocab ? token.vocab.word : token.key,
      definition: token.vocab?.definition ?? null,
      sentence: sentenceAt(paragraphs[p], token.start),
      ...popoverPosition(span.getBoundingClientRect()),
    });
  }

  // Mouse: check the selection right after the button is released.
  // Touch: selection handles move without pointer events, so wait until it settles.
  const touchTimer = useRef<number | undefined>(undefined);
  const lastPointer = useRef<string>("mouse");
  useEffect(() => {
    const onSelectionChange = () => {
      if (lastPointer.current !== "touch") return;
      window.clearTimeout(touchTimer.current);
      touchTimer.current = window.setTimeout(openFromSelection, 500);
    };
    document.addEventListener("selectionchange", onSelectionChange);
    return () => {
      document.removeEventListener("selectionchange", onSelectionChange);
      window.clearTimeout(touchTimer.current);
    };
  });

  return (
    <>
      <div
        ref={bodyRef}
        className="story-body"
        lang="en"
        onClick={handleClick}
        onPointerDown={(e) => {
          lastPointer.current = e.pointerType;
        }}
        onPointerUp={(e) => {
          if (e.pointerType === "mouse") window.setTimeout(openFromSelection, 0);
        }}
      >
        {parsed.map((tokens, pi) => (
          <p key={`${level}-${pi}`}>
            {tokens.map((tok, ti) =>
              tok.key ? (
                <span
                  key={ti}
                  className={`w${tok.vocab ? " vocab" : ""}${
                    selected?.paragraph === pi && selected.token === ti ? " selected" : ""
                  }`}
                  data-p={pi}
                  data-t={ti}
                >
                  {tok.text}
                </span>
              ) : (
                tok.text
              ),
            )}
          </p>
        ))}
      </div>
      {selected &&
        createPortal(
          <WordPopover
            key={`${selected.paragraph}-${selected.token}-${selected.word}`}
            ref={popoverRef}
            selected={selected}
            level={level}
            storyPath={storyPath}
            storyTitle={storyTitle}
          />,
          document.body,
        )}
    </>
  );
}

type PopoverProps = {
  ref: Ref<HTMLDivElement>;
  selected: Selected;
  level: Level;
  storyPath: string;
  storyTitle: string;
};

type TranslationState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; data: TranslateResult }
  | { status: "error"; error: string };

function WordPopover({ ref, selected, level, storyPath, storyTitle }: PopoverProps) {
  const { configured, ready, user, hasWord, saveWord, translate, translateTo } = useAccount();
  const [translation, setTranslation] = useState<TranslationState>({ status: "idle" });
  const [attempt, setAttempt] = useState(0);
  const [ownMode, setOwnMode] = useState(false);
  const [own, setOwn] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const saved = hasWord(selected.word);
  const loggedIn = configured && ready && !!user;
  const next = window.location.pathname + window.location.search;

  // Translate as soon as the popover opens (logged-in readers with a language chosen).
  useEffect(() => {
    if (!loggedIn || !translateTo) return;
    let cancelled = false;
    setTranslation({ status: "loading" });
    translate(selected.word, selected.sentence, level).then((result) => {
      if (cancelled) return;
      setTranslation(
        result.data ? { status: "done", data: result.data } : { status: "error", error: result.error ?? "" },
      );
    });
    return () => {
      cancelled = true;
    };
  }, [loggedIn, translateTo, selected.word, selected.sentence, level, translate, attempt]);

  const ai = translation.status === "done" ? translation.data : null;
  const definition = selected.definition ?? (ai?.definition || null);

  async function handleSave(useOwn: boolean) {
    setSaving(true);
    setError("");
    const result = await saveWord({
      word: selected.word,
      translation: useOwn ? own : (ai?.translation ?? null),
      definition,
      context: selected.sentence,
      storyPath,
      storyTitle,
      level,
    });
    setSaving(false);
    if (result.error) setError(result.error);
    else setOwnMode(false);
  }

  const baseHint =
    ai && (ai.base_form && normalizeWord(ai.base_form) !== normalizeWord(selected.word) ? ai.base_form : null);

  return (
    <div
      ref={ref}
      className="word-popover"
      role="dialog"
      aria-label={`Word: ${selected.word}`}
      style={{ top: selected.top, left: selected.left, width: POPOVER_WIDTH }}
    >
      <div className="phead">
        <div>
          <div className="pw">{selected.word}</div>
          {ai && (ai.part_of_speech || baseHint) && (
            <div className="pmeta">
              {ai.part_of_speech}
              {ai.part_of_speech && baseHint && " · "}
              {baseHint && <>base form: {baseHint}</>}
            </div>
          )}
        </div>
        {ai?.context_translation && (
          <div className="pcontext" aria-label="In this sentence">
            {ai.context_phrase && <span className="pcontext-en">{ai.context_phrase}</span>}
            <span className="pcontext-tr">{ai.context_translation}</span>
          </div>
        )}
      </div>

      {loggedIn && !translateTo && (
        <div className="ptrans-block">
          <LanguageSelect compact />
        </div>
      )}
      {loggedIn && translateTo && !ownMode && (
        <div className="ptrans-block" aria-live="polite">
          {translation.status === "loading" && <span className="ptrans-loading">Translating…</span>}
          {translation.status === "done" && <div className="ptrans">{translation.data.translation}</div>}
          {translation.status === "error" && (
            <div className="perror">
              {translation.error}{" "}
              <button type="button" className="link-button" onClick={() => setAttempt((n) => n + 1)}>
                Try again
              </button>
            </div>
          )}
        </div>
      )}
      {ownMode && (
        <form
          className="ptrans-block own-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (own.trim()) handleSave(true);
          }}
        >
          <label htmlFor="own-translation">Your translation</label>
          <input
            id="own-translation"
            value={own}
            maxLength={200}
            autoFocus
            onChange={(e) => setOwn(e.target.value)}
          />
        </form>
      )}

      {definition && <div className="pdef">{definition}</div>}

      <div className="pactions">
        {!configured || (ready && !user) ? (
          <Link href={`/login?next=${encodeURIComponent(next)}`} className="btn-solid small">
            Log in to translate and save
          </Link>
        ) : !ready ? null : saved ? (
          <span className="popover-saved">✓ In My Words</span>
        ) : ownMode ? (
          <>
            <button
              type="button"
              className="btn-solid small"
              onClick={() => handleSave(true)}
              disabled={saving || !own.trim()}
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button type="button" className="btn-ghost small" onClick={() => setOwnMode(false)}>
              Cancel
            </button>
          </>
        ) : (
          <>
            <button type="button" className="btn-solid small" onClick={() => handleSave(false)} disabled={saving}>
              {saving ? "Saving…" : "Add to My Words"}
            </button>
            <button
              type="button"
              className="btn-ghost small"
              onClick={() => {
                setOwn(ai?.translation ?? "");
                setOwnMode(true);
              }}
            >
              My own translation
            </button>
          </>
        )}
      </div>
      {error && <div className="perror">{error}</div>}
      {loggedIn && translateTo && (
        <div className="pfoot">
          <LanguageSelect compact />
        </div>
      )}
    </div>
  );
}
