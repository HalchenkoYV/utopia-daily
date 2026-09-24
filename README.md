# Utopia Daily

Good-news reading site for English learners: openly fictional, uplifting stories, each in five CEFR levels (A1–C1).

- Project brief: [PROJECT_BRIEF.md](PROJECT_BRIEF.md) · design reference: [mockup.html](mockup.html) · story prompt: [article-prompt.md](article-prompt.md)
- Stack: Next.js (App Router, TypeScript) on Vercel; stories are JSON files in `content/YYYY-MM-DD/story-N.json`.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Content

- One file per story: `content/YYYY-MM-DD/story-N.json` (N = 1..6), shape defined in `article-prompt.md`, plus `"status": "draft" | "published"`.
- Only `published` stories appear on the site.
- Check word counts and vocab: `npm run check-content` (or `npm run check-content -- 2026-09-24` for one day).

## Database (Supabase)

`supabase/schema.sql` creates all tables with Row Level Security. Paste it into Supabase → SQL Editor and run it (safe to re-run).

## Environment variables

See `.env.example`. Real values go into `.env.local` (never committed) and into Vercel → Project Settings → Environment Variables.
