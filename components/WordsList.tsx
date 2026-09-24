"use client";

import Link from "next/link";
import { useState } from "react";
import { levelLabel } from "@/lib/levels";
import { useAccount } from "./Account";
import { wordSourceHref } from "./WordsPanel";

export default function WordsList() {
  const { configured, ready, user, words, deleteWord } = useAccount();
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function handleDelete(id: string) {
    setDeleting(id);
    setError("");
    const result = await deleteWord(id);
    setDeleting(null);
    if (result.error) setError(result.error);
  }

  if (configured && !ready) {
    return <div className="words-page" />;
  }

  if (!configured || !user) {
    return (
      <div className="simple-page">
        <h1>My Words</h1>
        <p>Log in to keep a list of new words from the stories you read.</p>
        <Link href="/login?next=%2Fwords" className="btn-solid">
          Log in
        </Link>
      </div>
    );
  }

  return (
    <div className="words-page">
      <h1>My Words</h1>
      <p className="words-page-sub">
        {words.length === 0
          ? "No words yet. Open a story and click a word you don’t know."
          : `${words.length} ${words.length === 1 ? "word" : "words"} saved while reading.`}
      </p>
      {error && (
        <p className="form-message error" role="alert">
          {error}
        </p>
      )}
      <ul className="words-list">
        {words.map((w) => {
          const href = wordSourceHref(w);
          return (
            <li key={w.id} className="words-row">
              <div className="words-row-main">
                <div className="w">{w.word}</div>
                {w.definition && <div className="def">{w.definition}</div>}
                {href && (
                  <div className="words-row-src">
                    {w.level && (
                      <span className="level-tag" data-lvl={w.level}>
                        {levelLabel(w.level)}
                      </span>
                    )}
                    <Link href={href}>{w.story_title ?? "Open the story"}</Link>
                  </div>
                )}
              </div>
              <button
                type="button"
                className="btn-ghost small"
                onClick={() => handleDelete(w.id)}
                disabled={deleting === w.id}
                aria-label={`Delete “${w.word}”`}
              >
                {deleting === w.id ? "Deleting…" : "Delete"}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
