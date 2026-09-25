"use client";

import MyWords from "./MyWords";
import { useSiteState } from "./SiteState";

export default function WordsPanel() {
  const { wordsOpen } = useSiteState();

  return (
    <aside className={`words-panel${wordsOpen ? "" : " closed"}`} inert={!wordsOpen}>
      <h2>My Words</h2>
      <div className="sub">Words you marked while reading</div>
      <MyWords variant="panel" />
    </aside>
  );
}
