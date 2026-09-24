"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { formatDay } from "@/lib/dates";
import { DEFAULT_LEVEL, IELTS_NOTE, LEVELS, levelLabel, type Level } from "@/lib/levels";
import type { StoryView } from "@/lib/types";
import { useSiteState } from "./SiteState";
import StoryText from "./StoryText";

type Props = {
  story: StoryView;
  /** Level from ?level= in the URL, or null when the link had none. */
  urlLevel: Level | null;
};

export default function StoryReader({ story, urlLevel }: Props) {
  const { level: globalLevel, levelRestored, levelPicks } = useSiteState();
  const [level, setLevel] = useState<Level>(urlLevel ?? DEFAULT_LEVEL);
  const seenPicks = useRef(levelPicks);

  // Link without ?level=: read at the reader's saved level once it's known.
  useEffect(() => {
    if (levelRestored && !urlLevel) setLevel(globalLevel);
    // Only on the first restore — later header clicks are handled below.
  }, [levelRestored]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reader picked a level in the header while reading: follow it.
  useEffect(() => {
    if (levelPicks !== seenPicks.current) {
      seenPicks.current = levelPicks;
      setLevel(globalLevel);
    }
  }, [levelPicks, globalLevel]);

  // Keep ?level= in the address bar in sync, so a copied link opens the same version.
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("level") !== level) {
      url.searchParams.set("level", level);
      window.history.replaceState(null, "", url);
    }
  }, [level]);

  const text = story.levels[level];

  return (
    <article className="story-page">
      <Link href="/" className="back-link">
        ← All stories
      </Link>

      <div className={`thumb story-hero ${story.thumb}`} style={{ borderTopColor: `var(--lvl-${level})` }} />

      <div className="story-meta">
        <span className="topic">{story.topic}</span>
        <span className="dot">·</span>
        <span>{formatDay(story.date)}</span>
      </div>

      <h1>{text.title}</h1>
      <p className="story-dek">{text.excerpt}</p>

      <div className="story-levels">
        <div className="row">
          <span className="label" id="story-level-label">
            LEVEL
          </span>
          <div className="lvl-switch lg" role="group" aria-labelledby="story-level-label">
            {LEVELS.map((lvl) => (
              <button
                key={lvl}
                type="button"
                className={`lvl-chip${lvl === level ? " active" : ""}`}
                data-lvl={lvl}
                aria-pressed={lvl === level}
                onClick={() => setLevel(lvl)}
              >
                {levelLabel(lvl)}
              </button>
            ))}
          </div>
        </div>
        <div className="row small">
          <span className="ielts-note">{IELTS_NOTE[level]}</span>
          <span className="reading-time">
            {text.minutes} min read · {text.words} words
          </span>
        </div>
      </div>

      <p className="story-hint">Tip: click any word to see what it means and save it to My Words.</p>
      <StoryText
        paragraphs={text.paragraphs}
        vocab={text.vocab}
        level={level}
        storyPath={`${story.date}/${story.n}`}
        storyTitle={text.title}
      />
    </article>
  );
}
