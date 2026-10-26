"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { formatDay } from "@/lib/dates";
import { LEVELS } from "@/lib/levels";
import type { DaySummary, PublishedDay, StorySummary } from "@/lib/types";
import { FeedCard, StoryCard } from "./StoryCards";

type Props = {
  days: DaySummary[];
  popular: StorySummary[];
  /** Every day with published stories, newest first. */
  allDays: PublishedDay[];
  /** The day picked in the date filter, or null for the normal paged feed. */
  selectedDate: string | null;
  /** A ?date= that has no published stories (to say so), or null. */
  requestedDate: string | null;
  page: number;
  totalPages: number;
  /** Day shown with big cards and a level switcher. */
  featuredDate: string | null;
};

function pageHref(page: number): string {
  return page <= 1 ? "/" : `/?page=${page}`;
}

/** 1 … 4 5 6 … 12 — always the first and last page, plus neighbours of the current one. */
function pageNumbers(page: number, total: number): (number | "gap")[] {
  const wanted = new Set([1, total, page - 1, page, page + 1].filter((p) => p >= 1 && p <= total));
  const sorted = [...wanted].sort((a, b) => a - b);
  const result: (number | "gap")[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) result.push("gap");
    result.push(p);
  });
  return result;
}

function Pagination({ page, totalPages }: { page: number; totalPages: number }) {
  if (totalPages <= 1) return null;
  return (
    <nav className="pagination" aria-label="Older and newer stories">
      {page > 1 ? (
        <Link href={pageHref(page - 1)} className="page-step">
          ← Newer
        </Link>
      ) : (
        <span className="page-step disabled">← Newer</span>
      )}
      <div className="page-numbers">
        {pageNumbers(page, totalPages).map((p, i) =>
          p === "gap" ? (
            <span key={`gap-${i}`} className="page-gap">
              …
            </span>
          ) : (
            <Link
              key={p}
              href={pageHref(p)}
              className={`page-num${p === page ? " current" : ""}`}
              aria-current={p === page ? "page" : undefined}
            >
              {p}
            </Link>
          ),
        )}
      </div>
      {page < totalPages ? (
        <Link href={pageHref(page + 1)} className="page-step">
          Older →
        </Link>
      ) : (
        <span className="page-step disabled">Older →</span>
      )}
    </nav>
  );
}

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

export default function HomeFeed({
  days,
  popular,
  allDays,
  selectedDate,
  requestedDate,
  page,
  totalPages,
  featuredDate,
}: Props) {
  const [query, setQuery] = useState("");
  const localDays = useLocalDays();
  const router = useRouter();
  const q = query.trim().toLowerCase();
  const timelineDay = new Map(allDays.map((d) => [d.date, d.timelineDay]));

  function dayLabel(date: string, count: number): string {
    const pretty = formatDay(date);
    const day = timelineDay.get(date);
    const suffix = day ? ` · Day ${day}` : "";
    if (localDays?.today === date) {
      return `Today — ${pretty}${suffix} — ${count} new ${count === 1 ? "story" : "stories"}`;
    }
    if (localDays?.yesterday === date) return `Yesterday — ${pretty}${suffix}`;
    return `${pretty}${suffix}`;
  }

  const visibleDays = days
    .map((day) => ({ ...day, stories: day.stories.filter((s) => matches(s, q)) }))
    .filter((day) => day.stories.length > 0);
  const visiblePopular = popular.filter((s) => matches(s, q));
  const nothingFound = q !== "" && visibleDays.length === 0 && visiblePopular.length === 0;

  return (
    <>
      <div className="feed-toolbar">
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
        {allDays.length > 0 && (
          <label className="date-filter">
            <span>Date</span>
            <select
              value={selectedDate ?? ""}
              onChange={(e) => router.push(e.target.value ? `/?date=${e.target.value}` : "/")}
            >
              <option value="">All dates</option>
              {allDays.map((d) => (
                <option key={d.date} value={d.date}>
                  {formatDay(d.date)} · Day {d.timelineDay}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {selectedDate && (
        <p className="filter-note">
          Showing stories from {formatDay(selectedDate)}.{" "}
          <Link href="/" className="text-link">
            Show all dates
          </Link>
        </p>
      )}
      {requestedDate && (
        <p className="no-results">
          There are no stories for {requestedDate}.{" "}
          <Link href="/" className="text-link">
            Show all dates
          </Link>
        </p>
      )}
      {days.length === 0 && !requestedDate && (
        <p className="no-results">New stories are on their way. Please check back soon.</p>
      )}
      {nothingFound && <p className="no-results">No stories on this page match “{query.trim()}”.</p>}

      {visibleDays.map((day) => {
        const isNewest = day.date === featuredDate;
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

      {selectedDate ? (
        <p className="filter-note bottom">
          <Link href="/" className="text-link">
            ← Back to all stories
          </Link>
        </p>
      ) : (
        <Pagination page={page} totalPages={totalPages} />
      )}
    </>
  );
}
