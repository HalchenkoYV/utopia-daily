"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type MouseEvent, type Ref } from "react";
import { createPortal } from "react-dom";
import type { Level } from "@/lib/levels";
import type { VocabItem } from "@/lib/types";
import { normalizeWord, useAccount } from "./Account";

type Props = {
  paragraphs: string[];
  vocab: VocabItem[];
  level: Level;
  storyPath: string; // "2026-09-24/1"
  storyTitle: string;
};

type VocabEntry = { word: string; definition: string; parts: string[] };
type Token = { text: string; key?: string; vocab?: VocabEntry };

// Letters with optional inner apostrophes: "don't", "Rosa's". Numbers and punctuation stay plain text.
const WORD_RE = /[\p{L}\p{M}]+(?:['’][\p{L}\p{M}]+)*/gu;
const POPOVER_WIDTH = 280;

function tokenize(paragraph: string, entries: VocabEntry[]): Token[] {
  const tokens: Token[] = [];
  let last = 0;
  for (const m of paragraph.matchAll(WORD_RE)) {
    const start = m.index ?? 0;
    if (start > last) tokens.push({ text: paragraph.slice(last, start) });
    tokens.push({ text: m[0], key: normalizeWord(m[0]) });
    last = start + m[0].length;
  }
  if (last < paragraph.length) tokens.push({ text: paragraph.slice(last) });

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

type Selected = {
  paragraph: number;
  token: number;
  word: string;
  definition: string | null;
  top: number;
  left: number;
};

export default function StoryText({ paragraphs, vocab, level, storyPath, storyTitle }: Props) {
  const [selected, setSelected] = useState<Selected | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const parsed = useMemo(() => {
    const entries = vocab.map((v) => ({
      word: v.word,
      definition: v.definition,
      parts: normalizeWord(v.word).split(/\s+/),
    }));
    return paragraphs.map((p) => tokenize(p, entries));
  }, [paragraphs, vocab]);

  // Close on level change, Escape, resize or a click outside the popover.
  useEffect(() => setSelected(null), [level]);
  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSelected(null);
    const onDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement;
      if (popoverRef.current?.contains(target) || target.closest?.(".story-body .w")) return;
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

  function handleClick(e: MouseEvent<HTMLDivElement>) {
    const span = (e.target as HTMLElement).closest<HTMLElement>(".w");
    if (!span) return;
    const p = Number(span.dataset.p);
    const t = Number(span.dataset.t);
    const token = parsed[p]?.[t];
    if (!token?.key) return;
    if (selected?.paragraph === p && selected.token === t) {
      setSelected(null);
      return;
    }
    const rect = span.getBoundingClientRect();
    const viewport = document.documentElement.clientWidth;
    const left = Math.min(Math.max(rect.left + rect.width / 2 - POPOVER_WIDTH / 2, 12), viewport - POPOVER_WIDTH - 12);
    setSelected({
      paragraph: p,
      token: t,
      word: token.vocab ? token.vocab.word : token.key,
      definition: token.vocab?.definition ?? null,
      top: rect.bottom + window.scrollY + 8,
      left: left + window.scrollX,
    });
  }

  return (
    <>
      <div className="story-body" lang="en" onClick={handleClick}>
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
            key={`${selected.paragraph}-${selected.token}`}
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

function WordPopover({ ref, selected, level, storyPath, storyTitle }: PopoverProps) {
  const { configured, ready, user, hasWord, saveWord } = useAccount();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const saved = hasWord(selected.word);
  const next = typeof window === "undefined" ? "/" : window.location.pathname + window.location.search;

  async function handleSave() {
    setSaving(true);
    setError("");
    const result = await saveWord({
      word: selected.word,
      definition: selected.definition,
      storyPath,
      storyTitle,
      level,
    });
    setSaving(false);
    if (result.error) setError(result.error);
  }

  let action;
  if (!configured || (ready && !user)) {
    action = (
      <Link href={`/login?next=${encodeURIComponent(next)}`} className="btn-solid small">
        Log in to save words
      </Link>
    );
  } else if (!ready) {
    action = null;
  } else if (saved) {
    action = <span className="popover-saved">✓ In My Words</span>;
  } else {
    action = (
      <button type="button" className="btn-solid small" onClick={handleSave} disabled={saving}>
        {saving ? "Saving…" : selected.definition ? "Add to My Words" : "Save"}
      </button>
    );
  }

  return (
    <div
      ref={ref}
      className="word-popover"
      role="dialog"
      aria-label={`Word: ${selected.word}`}
      style={{ top: selected.top, left: selected.left, width: POPOVER_WIDTH }}
    >
      <div className="pw">{selected.word}</div>
      {selected.definition && <div className="pdef">{selected.definition}</div>}
      {action && <div className="pactions">{action}</div>}
      {error && <div className="perror">{error}</div>}
    </div>
  );
}
