"use client";

import { useSiteState } from "./SiteState";

export default function WordsPanel() {
  const { wordsOpen } = useSiteState();

  return (
    <aside className={`words-panel${wordsOpen ? "" : " closed"}`} aria-hidden={!wordsOpen}>
      <h2>My Words</h2>
      <div className="sub">Words you marked while reading</div>
      <div className="words-empty">
        <p>No words yet.</p>
        <p>Soon you can click any word in a story and save it here, together with its meaning.</p>
      </div>
    </aside>
  );
}
