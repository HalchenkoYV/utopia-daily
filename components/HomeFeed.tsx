"use client";

import { useEffect, useState } from "react";
import { formatDay } from "@/lib/dates";
import { LEVELS } from "@/lib/levels";
import type { DaySummary, StorySummary } from "@/lib/types";
import { FeedCard, StoryCard } from "./StoryCards";

type Props = { days: DaySummary[]; popular: StorySummary[] };

function localDateKey(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Reader's local today/yesterday. Null until mounted, because the server doesn't know the reader's time zone. */
function useLocalDays() {
  const [days, setDays] = useState<{ today: string; yesterday: string } | null>(null);
  useEffect(() => {
    setDays({ today: localDateKey(0), yesterday: localDateKey(-1) });
  }, []);
  return days;
}

function matches(story: StorySummary, query: string): boolean {
  if (!query) return true;
  const haystack = [
    story.topic,
    ...LEVELS.flatMap((lvl) => [story.levels[lvl].title, story.levels[lvl].excerpt]),
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(query);
}

export default function HomeFeed({ days, popular }: Props) {
  const [query, setQuery] = useState("");
  const localDays = useLocalDays();
  const q = query.trim().toLowerCase();

  function dayLabel(date: string, count: number): string {
    const pretty = formatDay(date);
    if (localDays?.today === date) return `Today — ${pretty} — ${count} new ${count === 1 ? "story" : "stories"}`;
    if (localDays?.yesterday === date) return `Yesterday — ${pretty}`;
    return pretty;
  }

  const visibleDays = days
    .map((day) => ({ ...day, stories: day.stories.filter((s) => matches(s, q)) }))
    .filter((day) => day.stories.length > 0);
  const visiblePopular = popular.filter((s) => matches(s, q));
  const nothingFound = q !== "" && visibleDays.length === 0 && visiblePopular.length === 0;

  return (
    <>
      <div className="search-bar">
        <span className="icon" aria-hidden="true">
          ⌕
        </span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search stories, topics, words…"
          aria-label="Search stories"
        />
      </div>

      {days.length === 0 && <p className="no-results">New stories are on their way. Please check back soon.</p>}
      {nothingFound && <p className="no-results">No stories match “{query.trim()}”.</p>}

      {visibleDays.map((day) => {
        // The newest day gets the big cards with a level switcher, like "Today" in the mockup.
        const isNewest = day.date === days[0]?.date;
        const fullCount = days.find((d) => d.date === day.date)?.stories.length ?? day.stories.length;
        return (
          <section className="day-block" key={day.date}>
            <div className="day-label">{dayLabel(day.date, fullCount)}</div>
            <div className={isNewest ? "today-grid" : "feed-grid"}>
              {day.stories.map((story) =>
                isNewest ? (
                  <StoryCard key={story.n} story={story} />
                ) : (
                  <FeedCard key={story.n} story={story} />
                ),
              )}
            </div>
          </section>
        );
      })}

      {visiblePopular.length > 0 && (
        <section className="day-block">
          <div className="day-label">Popular</div>
          <div className="feed-grid">
            {visiblePopular.map((story) => (
              <FeedCard key={`${story.date}-${story.n}`} story={story} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
