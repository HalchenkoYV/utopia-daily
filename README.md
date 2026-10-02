# Utopia Daily

Good-news reading site for English learners: openly fictional stories from the **Utopia Timeline** — our real world until 27 September 2026, then a branch that slowly gets better. Nine stories a day (one per rubric), each in six levels (A1–C1 and Native).

- Project brief: [PROJECT_BRIEF.md](PROJECT_BRIEF.md) · design reference: [mockup.html](mockup.html) · how stories are made: [article-prompt.md](article-prompt.md)
- Stack: Next.js (App Router, TypeScript) on Vercel; stories live in the Supabase table `stories`.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Content

- Stories are rows of the Supabase table `stories` (primary key `date` + `n`, n = rubric 1..9). Only rows with `status = 'published'` are visible to the site (Row Level Security).
- Each row has `levels` (`a1`…`c1`, `native`: title, excerpt, body, vocab, reality_check) and `images` (1–3 SVG drawings with alt text and caption, served at `/img/<date>/<n>/<i>.svg`).
- A daily scheduled Claude task (skill `utopia-daily-issue`) writes the new issue every morning, Kyiv time. The world's memory — rules, roadmap, chronicle, rubric dossiers, names, World Meter — lives in the private tables `world_docs`, `world_chronicle`, `world_entities` and `world_metrics`.
- Check a day: `select * from public.check_issue('2026-09-28');` in the Supabase SQL editor (no rows = all good).
- Pages cache stories for 5 minutes, so a new issue appears on the site within minutes, without a redeploy.

## Database (Supabase)

`supabase/schema.sql` creates all tables with Row Level Security. Paste it into Supabase → SQL Editor and run it (safe to re-run).

## Environment variables

See `.env.example`. Real values go into `.env.local` (never committed) and into Vercel → Project Settings → Environment Variables.
