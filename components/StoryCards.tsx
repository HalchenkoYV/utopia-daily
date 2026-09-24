"use client";

import { useState } from "react";
import { IELTS_NOTE, LEVELS, levelLabel, type Level } from "@/lib/levels";
import type { StorySummary } from "@/lib/types";
import { useSiteState } from "./SiteState";

/** Big card for the newest day: has its own level switcher (reset by the global YOUR LEVEL). */
export function StoryCard({ story }: { story: StorySummary }) {
  const { level: globalLevel } = useSiteState();
  // A per-card choice only lasts until the global level changes, like in the mockup.
  const [override, setOverride] = useState<{ level: Level; base: Level } | null>(null);
  const level = override && override.base === globalLevel ? override.level : globalLevel;
  const text = story.levels[level];

  return (
    <article className="story-card" style={{ borderTopColor: `var(--lvl-${level})` }}>
      <div className={`thumb ${story.thumb}`} />
      <div className="body">
        <div className="story-topic">{story.topic}</div>
        <h3>{text.title}</h3>
        <p className="excerpt">{text.excerpt}</p>
        <div className="lvl-switch" role="group" aria-label="Story level">
          {LEVELS.map((lvl) => (
            <button
              key={lvl}
              type="button"
              className={`lvl-chip${lvl === level ? " active" : ""}`}
              data-lvl={lvl}
              aria-pressed={lvl === level}
              onClick={() => setOverride({ level: lvl, base: globalLevel })}
            >
              {levelLabel(lvl)}
            </button>
          ))}
        </div>
        <div className="ielts-note">{IELTS_NOTE[level]}</div>
        <div className="story-foot">
          <span>{text.minutes} min read</span>
        </div>
      </div>
    </article>
  );
}

/** Compact card for older days and Popular: shown at the reader's global level. */
export function FeedCard({ story }: { story: StorySummary }) {
  const { level } = useSiteState();
  const text = story.levels[level];

  return (
    <article className="feed-card">
      <div className={`thumb ${story.thumb}`} />
      <div className="body">
        <div className="topic">{story.topic}</div>
        <h3>{text.title}</h3>
        <p className="excerpt">{text.excerpt}</p>
        <div className="feed-foot">
          <span className="level-tag" data-lvl={level}>
            {levelLabel(level)}
          </span>
          <span className="dot">·</span>
          <span>{text.minutes} min read</span>
        </div>
      </div>
    </article>
  );
}
