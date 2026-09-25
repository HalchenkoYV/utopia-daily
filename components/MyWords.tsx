"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { FamilyWord } from "@/lib/types";
import { useAccount, type SavedWord } from "./Account";
import LanguageSelect from "./LanguageSelect";

const PANEL_LIMIT = 20;

type Variant = "panel" | "page";

/** "2026-09-24/1" + level → "/story/2026-09-24/1?level=b1" */
function wordSourceHref(word: SavedWord): string | null {
  if (!word.story_path) return null;
  return `/story/${word.story_path}${word.level ? `?level=${word.level}` : ""}`;
}

/** The saved sentence with the word itself in bold. */
function Sentence({ text, word }: { text: string; word: string }) {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/'/g, "['’]");
  const match = new RegExp(`(^|[^\\p{L}])(${escaped})(?=[^\\p{L}]|$)`, "iu").exec(text);
  if (!match) return <>“{text}”</>;
  const start = match.index + match[1].length;
  const end = start + match[2].length;
  return (
    <>
      “{text.slice(0, start)}
      <mark>{text.slice(start, end)}</mark>
      {text.slice(end)}”
    </>
  );
}

/** My Words list with add / edit / word family / delete. Used by the sidebar and by /words. */
export default function MyWords({ variant }: { variant: Variant }) {
  const { configured, ready, user, words } = useAccount();
  const pathname = usePathname();
  const [adding, setAdding] = useState(false);
  const isPanel = variant === "panel";

  if (configured && !ready) return null;

  if (!configured || !user) {
    return isPanel ? (
      <div className="words-empty">
        <p>Click any word in a story to see what it means.</p>
        <p>
          <Link href={`/login?next=${encodeURIComponent(pathname)}`} className="text-link">
            Log in
          </Link>{" "}
          to get translations in your language and save words here.
        </p>
      </div>
    ) : (
      <div className="simple-page">
        <h1>My Words</h1>
        <p>Log in to keep a list of new words, with translations, from the stories you read.</p>
        <Link href="/login?next=%2Fwords" className="btn-solid">
          Log in
        </Link>
      </div>
    );
  }

  const shown = isPanel ? words.slice(0, PANEL_LIMIT) : words;

  return (
    <div className={`my-words ${variant}`}>
      {!isPanel && (
        <>
          <h1>My Words</h1>
          <p className="words-page-sub">
            {words.length === 0
              ? "No words yet."
              : `${words.length} ${words.length === 1 ? "word" : "words"} saved.`}
          </p>
        </>
      )}

      <div className="mw-tools">
        <LanguageSelect compact={isPanel} />
        {!adding && (
          <button type="button" className="btn-ghost small" onClick={() => setAdding(true)}>
            + Add a word
          </button>
        )}
      </div>

      {adding && <AddWordForm onDone={() => setAdding(false)} />}

      {words.length === 0 && !adding && (
        <div className="words-empty">
          <p>Open a story and click a word you don’t know — or add your own word above.</p>
        </div>
      )}

      <ul className="mw-list">
        {shown.map((w) => (
          <WordCard key={w.id} word={w} variant={variant} />
        ))}
      </ul>

      {isPanel && words.length > 0 && (
        <Link href="/words" className="see-all">
          {words.length > PANEL_LIMIT ? `See all ${words.length} words →` : "Open My Words page →"}
        </Link>
      )}
    </div>
  );
}

function AddWordForm({ onDone }: { onDone: () => void }) {
  const { saveWord, translate, translateTo } = useAccount();
  const [word, setWord] = useState("");
  const [translation, setTranslation] = useState("");
  const [definition, setDefinition] = useState("");
  const [busy, setBusy] = useState<"translate" | "save" | null>(null);
  const [error, setError] = useState("");

  async function autoTranslate() {
    if (!word.trim()) {
      setError("Type a word first.");
      return;
    }
    setBusy("translate");
    setError("");
    const result = await translate(word, null, null);
    setBusy(null);
    if (result.error || !result.data) {
      setError(result.error ?? "Translation is not available right now.");
      return;
    }
    setTranslation(result.data.translation);
    if (!definition.trim()) setDefinition(result.data.definition);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy("save");
    setError("");
    const result = await saveWord({ word, translation, definition });
    setBusy(null);
    if (result.error) setError(result.error);
    else onDone();
  }

  return (
    <form className="mw-form" onSubmit={submit}>
      <label>
        <span>Word or phrase</span>
        <input value={word} onChange={(e) => setWord(e.target.value)} required maxLength={64} autoFocus />
      </label>
      <label>
        <span>Translation</span>
        <div className="input-row">
          <input value={translation} onChange={(e) => setTranslation(e.target.value)} maxLength={200} />
          <button
            type="button"
            className="btn-ghost small"
            onClick={autoTranslate}
            disabled={busy !== null || !translateTo}
            title={translateTo ? undefined : "Choose a language first"}
          >
            {busy === "translate" ? "…" : "Translate"}
          </button>
        </div>
      </label>
      <label>
        <span>
          Meaning in English <small>(optional)</small>
        </span>
        <input value={definition} onChange={(e) => setDefinition(e.target.value)} maxLength={500} />
      </label>
      <div className="mw-form-actions">
        <button type="submit" className="btn-solid small" disabled={busy !== null}>
          {busy === "save" ? "Saving…" : "Save"}
        </button>
        <button type="button" className="btn-ghost small" onClick={onDone}>
          Cancel
        </button>
      </div>
      {error && <div className="perror">{error}</div>}
    </form>
  );
}

type FamilyState =
  | { status: "closed" }
  | { status: "loading" }
  | { status: "done"; words: FamilyWord[] }
  | { status: "error"; error: string };

function WordCard({ word, variant }: { word: SavedWord; variant: Variant }) {
  const { updateWord, deleteWord, translate, wordFamily, saveWord, hasWord, translateTo } = useAccount();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ word: "", translation: "", definition: "" });
  const [family, setFamily] = useState<FamilyState>({ status: "closed" });
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const href = wordSourceHref(word);

  function startEdit() {
    setDraft({ word: word.word, translation: word.translation ?? "", definition: word.definition ?? "" });
    setError("");
    setEditing(true);
  }

  async function saveEdit(e: FormEvent) {
    e.preventDefault();
    setBusy("save");
    setError("");
    const result = await updateWord(word.id, draft);
    setBusy(null);
    if (result.error) setError(result.error);
    else setEditing(false);
  }

  /** Fill in a translation — uses the saved sentence, so the meaning matches the story. */
  async function fetchTranslation(): Promise<string | null> {
    const result = await translate(editing ? draft.word : word.word, word.context, word.level);
    if (result.error || !result.data) {
      setError(result.error ?? "Translation is not available right now.");
      return null;
    }
    return result.data.translation;
  }

  async function translateInDraft() {
    setBusy("translate");
    setError("");
    const t = await fetchTranslation();
    setBusy(null);
    if (t) setDraft((d) => ({ ...d, translation: t }));
  }

  async function addTranslation() {
    setBusy("translate");
    setError("");
    const t = await fetchTranslation();
    if (t) {
      const result = await updateWord(word.id, { word: word.word, translation: t, definition: word.definition });
      if (result.error) setError(result.error);
    }
    setBusy(null);
  }

  async function toggleFamily() {
    if (family.status !== "closed") {
      setFamily({ status: "closed" });
      return;
    }
    setFamily({ status: "loading" });
    const result = await wordFamily(word.word);
    setFamily(result.data ? { status: "done", words: result.data } : { status: "error", error: result.error ?? "" });
  }

  async function addFamilyWord(fw: FamilyWord) {
    setBusy(`family:${fw.word}`);
    setError("");
    const result = await saveWord({
      word: fw.word,
      translation: fw.translation,
      definition: fw.definition,
      relatedTo: word.word,
    });
    setBusy(null);
    if (result.error) setError(result.error);
  }

  async function remove() {
    setBusy("delete");
    setError("");
    const result = await deleteWord(word.id);
    if (result.error) {
      setError(result.error);
      setBusy(null);
    }
  }

  if (editing) {
    return (
      <li className="word-item editing">
        <form className="mw-form" onSubmit={saveEdit}>
          <label>
            <span>Word or phrase</span>
            <input
              value={draft.word}
              onChange={(e) => setDraft({ ...draft, word: e.target.value })}
              required
              maxLength={64}
              autoFocus
            />
          </label>
          <label>
            <span>Translation</span>
            <div className="input-row">
              <input
                value={draft.translation}
                onChange={(e) => setDraft({ ...draft, translation: e.target.value })}
                maxLength={200}
              />
              <button
                type="button"
                className="btn-ghost small"
                onClick={translateInDraft}
                disabled={busy !== null || !translateTo}
              >
                {busy === "translate" ? "…" : "Translate"}
              </button>
            </div>
          </label>
          <label>
            <span>Meaning in English</span>
            <input
              value={draft.definition}
              onChange={(e) => setDraft({ ...draft, definition: e.target.value })}
              maxLength={500}
            />
          </label>
          <div className="mw-form-actions">
            <button type="submit" className="btn-solid small" disabled={busy !== null}>
              {busy === "save" ? "Saving…" : "Save"}
            </button>
            <button type="button" className="btn-ghost small" onClick={() => setEditing(false)}>
              Cancel
            </button>
          </div>
          {error && <div className="perror">{error}</div>}
        </form>
      </li>
    );
  }

  return (
    <li className="word-item">
      <div className="w">{word.word}</div>
      {word.translation ? (
        <div className="tr">{word.translation}</div>
      ) : (
        translateTo && (
          <button type="button" className="link-button" onClick={addTranslation} disabled={busy !== null}>
            {busy === "translate" ? "Translating…" : "+ Add translation"}
          </button>
        )
      )}
      {word.definition && <div className="def">{word.definition}</div>}
      {word.context ? (
        href ? (
          <Link href={href} className="ctx" title={word.story_title ? `From “${word.story_title}”` : undefined}>
            <Sentence text={word.context} word={word.word} />
          </Link>
        ) : (
          <div className="ctx">
            <Sentence text={word.context} word={word.word} />
          </div>
        )
      ) : (
        href &&
        word.story_title && (
          <Link href={href} className="src">
            {word.story_title}
          </Link>
        )
      )}
      {word.related_to && <div className="rel">Word family of “{word.related_to}”</div>}

      <div className="mw-actions">
        <button type="button" className="link-button" onClick={startEdit}>
          Edit
        </button>
        <button type="button" className="link-button" onClick={toggleFamily} disabled={!translateTo}>
          {family.status === "closed" ? "Word family" : "Hide word family"}
        </button>
        <button type="button" className="link-button danger" onClick={remove} disabled={busy === "delete"}>
          {busy === "delete" ? "Deleting…" : "Delete"}
        </button>
      </div>

      {family.status === "loading" && <div className="family-note">Finding related words…</div>}
      {family.status === "error" && <div className="perror">{family.error}</div>}
      {family.status === "done" &&
        (family.words.length === 0 ? (
          <div className="family-note">No common related words found.</div>
        ) : (
          <ul className="family-list">
            {family.words.map((fw) => (
              <li key={fw.word}>
                <div className="family-main">
                  <span className="fw">{fw.word}</span>
                  {fw.part_of_speech && <span className="pos">{fw.part_of_speech}</span>}
                  {fw.translation && <span className="ftr">{fw.translation}</span>}
                  {fw.definition && <div className="def">{fw.definition}</div>}
                </div>
                {hasWord(fw.word) ? (
                  <span className="popover-saved">✓ Added</span>
                ) : (
                  <button
                    type="button"
                    className="btn-ghost small"
                    onClick={() => addFamilyWord(fw)}
                    disabled={busy !== null}
                  >
                    {busy === `family:${fw.word}` ? "…" : "+ Add"}
                  </button>
                )}
              </li>
            ))}
          </ul>
        ))}
      {error && <div className="perror">{error}</div>}
    </li>
  );
}
