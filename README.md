# Utopia Daily

Good-news reading site for English learners: openly fictional stories from the **Utopia Timeline** — our real world until 19 October 2026, then a branch that slowly gets better (Day 1 = 20 October 2026). Six stories a day, one per rubric, each in six levels (A1–C1 and Native).

- Project brief: [PROJECT_BRIEF.md](PROJECT_BRIEF.md) · design reference: [mockup.html](mockup.html) · how stories are made: [article-prompt.md](article-prompt.md)
- Stack: Next.js (App Router, TypeScript) on Vercel; stories live in the Supabase table `stories`.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Content

- Stories are rows of the Supabase table `stories` (primary key `date` + `n`, n = rubric number 1, 2, 4, 5, 6 or 7). Only rows with `status = 'published'` are visible to the site (Row Level Security).
- Each row has `levels` (`a1`…`c1`, `native`: title, excerpt, body, vocab, reality_check) and `images` (the cover: an AI photo in `photo`, with an SVG placeholder served at `/img/<date>/<n>/<i>.svg`, alt text and caption).
- A daily scheduled Claude task writes the new issue every morning, Kyiv time, following the procedure in `world_docs` (path `skill`). The world's memory — rules, roadmap, chronicle, rubric dossiers, names, World Meter — lives in the private tables `world_docs`, `world_chronicle`, `world_entities` and `world_metrics`.
- Check a day: `select * from public.check_issue('2026-10-20');` in the Supabase SQL editor (no rows = all good).
- Pages cache stories for 5 minutes, so a new issue appears on the site within minutes, without a redeploy.

## Database (Supabase)

`supabase/schema.sql` creates all tables with Row Level Security. Paste it into Supabase → SQL Editor and run it (safe to re-run).

## Environment variables

See `.env.example`. Real values go into `.env.local` (never committed) and into Vercel → Project Settings → Environment Variables.
