import HomeFeed from "@/components/HomeFeed";
import { getPublishedDays, getStoriesForDays, toDaySummary, toSummary } from "@/lib/content";

const DAYS_PER_PAGE = 3;
const POPULAR_COUNT = 6;

// New issues arrive in the database every morning; cached answers are refreshed every 5 minutes.
export const revalidate = 300;

type Props = { searchParams: Promise<{ page?: string | string[]; date?: string | string[] }> };

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function HomePage({ searchParams }: Props) {
  const params = await searchParams;
  const allDays = await getPublishedDays();
  const totalPages = Math.max(1, Math.ceil(allDays.length / DAYS_PER_PAGE));

  // ?date=YYYY-MM-DD shows one day; otherwise ?page=N shows N-th group of days (1 = newest).
  const requestedDate = first(params.date);
  const selectedDate = allDays.some((d) => d.date === requestedDate) ? requestedDate! : null;
  const page = Math.min(Math.max(Number.parseInt(first(params.page) ?? "1", 10) || 1, 1), totalPages);

  const shownDates = selectedDate
    ? [selectedDate]
    : allDays.slice((page - 1) * DAYS_PER_PAGE, page * DAYS_PER_PAGE).map((d) => d.date);
  const days = await getStoriesForDays(shownDates);

  // Until view counting exists, "Popular" (front page only) falls back to the most recent stories.
  const popular =
    !selectedDate && page === 1
      ? days
          .flatMap((day) => day.stories)
          .slice(0, POPULAR_COUNT)
          .map(toSummary)
      : [];

  return (
    <HomeFeed
      days={days.map(toDaySummary)}
      popular={popular}
      allDays={allDays}
      selectedDate={selectedDate}
      requestedDate={requestedDate && !selectedDate ? requestedDate : null}
      page={page}
      totalPages={totalPages}
      // Big cards with a level switcher: the newest issue on the front page, or the day the reader picked.
      featuredDate={selectedDate ?? (page === 1 ? (allDays[0]?.date ?? null) : null)}
    />
  );
}
