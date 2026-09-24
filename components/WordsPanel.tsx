"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAccount, type SavedWord } from "./Account";
import { useSiteState } from "./SiteState";

const PANEL_LIMIT = 20;

/** "2026-09-24/1" + level → "/story/2026-09-24/1?level=b1" */
export function wordSourceHref(word: SavedWord): string | null {
  if (!word.story_path) return null;
  return `/story/${word.story_path}${word.level ? `?level=${word.level}` : ""}`;
}

export default function WordsPanel() {
  const { wordsOpen } = useSiteState();
  const { configured, ready, user, words } = useAccount();
  const pathname = usePathname();
  const shown = words.slice(0, PANEL_LIMIT);

  let content;
  if (!configured || (ready && !user)) {
    content = (
      <div className="words-empty">
        <p>Click any word in a story to see what it means.</p>
        <p>
          <Link href={`/login?next=${encodeURIComponent(pathname)}`} className="text-link">
            Log in
          </Link>{" "}
          to save words here and review them later.
        </p>
      </div>
    );
  } else if (user && words.length === 0) {
    content = (
      <div className="words-empty">
        <p>No words yet.</p>
        <p>Open a story, click a word you don’t know and choose “Add to My Words”.</p>
      </div>
    );
  } else {
    content = (
      <>
        {shown.map((w) => {
          const href = wordSourceHref(w);
          return (
            <div className="word-item" key={w.id}>
              <div className="w">{w.word}</div>
              {w.definition && <div className="def">{w.definition}</div>}
              {href && w.story_title && (
                <Link href={href} className="src">
                  {w.story_title}
                </Link>
              )}
            </div>
          );
        })}
        {words.length > 0 && (
          <Link href="/words" className="see-all">
            {words.length > PANEL_LIMIT ? `See all ${words.length} words →` : "Manage my words →"}
          </Link>
        )}
      </>
    );
  }

  return (
    <aside className={`words-panel${wordsOpen ? "" : " closed"}`} inert={!wordsOpen}>
      <h2>My Words</h2>
      <div className="sub">Words you marked while reading</div>
      {content}
    </aside>
  );
}
