// "2026-09-24" -> "Thursday, September 24". Computed in UTC so server and browser agree.
export function formatDay(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

export function storyHref(date: string, n: number, level?: string): string {
  return `/story/${date}/${n}${level ? `?level=${level}` : ""}`;
}
