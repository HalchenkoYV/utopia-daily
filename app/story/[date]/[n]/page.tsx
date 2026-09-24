import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FeedCard } from "@/components/StoryCards";
import StoryReader from "@/components/StoryReader";
import { getDayStories, getStory, toStoryView, toSummary } from "@/lib/content";
import { formatDay } from "@/lib/dates";
import { DEFAULT_LEVEL, isLevel, type Level } from "@/lib/levels";

type Props = {
  params: Promise<{ date: string; n: string }>;
  searchParams: Promise<{ level?: string | string[] }>;
};

function pickLevel(raw: string | string[] | undefined): Level | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return isLevel(value) ? value : null;
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { date, n } = await params;
  const story = getStory(date, n);
  if (!story) return { title: "Story not found — Utopia Daily" };
  const level = pickLevel((await searchParams).level) ?? DEFAULT_LEVEL;
  const text = story.levels[level];
  return { title: `${text.title} — Utopia Daily`, description: text.excerpt };
}

export default async function StoryPage({ params, searchParams }: Props) {
  const { date, n } = await params;
  const story = getStory(date, n);
  if (!story) notFound();

  const urlLevel = pickLevel((await searchParams).level);
  const moreFromDay = getDayStories(date)
    .filter((s) => s.n !== story.n)
    .map(toSummary);

  return (
    <>
      <StoryReader story={toStoryView(story)} urlLevel={urlLevel} />

      {moreFromDay.length > 0 && (
        <section className="day-block more-stories">
          <div className="day-label">More from {formatDay(date)}</div>
          <div className="feed-grid">
            {moreFromDay.map((s) => (
              <FeedCard key={s.n} story={s} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
