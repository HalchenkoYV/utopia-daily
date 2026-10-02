// Story drawings: /img/2026-09-28/1/0.svg → the cleaned SVG of drawing 0 (the cover) of story 1.
import { getStoryImage } from "@/lib/content";

export const revalidate = 3600;

type Params = { params: Promise<{ date: string; n: string; i: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { date, n, i } = await params;
  const svg = await getStoryImage(date, n, i.replace(/\.svg$/, ""));
  if (!svg) return new Response("Not found", { status: 404 });
  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
      // Even if someone opens the file directly, nothing in it can run.
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
