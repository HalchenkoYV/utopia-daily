import HomeFeed from "@/components/HomeFeed";
import { getDays, toDaySummary, toSummary } from "@/lib/content";

const DAYS_ON_HOME = 3;
const POPULAR_COUNT = 6;

export default function HomePage() {
  const days = getDays();
  const recentDays = days.slice(0, DAYS_ON_HOME).map(toDaySummary);
  // Until view counting exists (step 5), "Popular" falls back to the most recent stories.
  const popular = days
    .flatMap((day) => day.stories)
    .slice(0, POPULAR_COUNT)
    .map(toSummary);

  return <HomeFeed days={recentDays} popular={popular} />;
}
