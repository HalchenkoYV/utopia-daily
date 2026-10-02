import HomeFeed from "@/components/HomeFeed";
import { getRecentDays, toDaySummary, toSummary } from "@/lib/content";

const DAYS_ON_HOME = 3;
const POPULAR_COUNT = 6;

// New issues arrive in the database every morning; refresh the cached page every 5 minutes.
export const revalidate = 300;

export default async function HomePage() {
  const days = await getRecentDays(DAYS_ON_HOME);
  const recentDays = days.map(toDaySummary);
  // Until view counting exists (step 5), "Popular" falls back to the most recent stories.
  const popular = days
    .flatMap((day) => day.stories)
    .slice(0, POPULAR_COUNT)
    .map(toSummary);

  return <HomeFeed days={recentDays} popular={popular} />;
}
