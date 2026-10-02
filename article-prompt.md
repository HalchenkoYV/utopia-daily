# How Utopia Daily stories are made

Stories are no longer generated from a single prompt in this repository.

- **Rules of the world** (premise, rubrics, realism, honesty, voice, levels, drawings): Supabase table `world_docs`, path `bible`.
- **Daily procedure** (re-read the world, plan, write Native, adapt to C1–A1 with cheaper models, draw, check, publish, update the world's memory): the Claude skill `utopia-daily-issue`, run every morning by a scheduled task.
- **The world's memory**: `world_docs` (roadmap, baseline, dossiers, big themes), `world_chronicle`, `world_entities`, `world_metrics`.
- **Quality check of a day**: `select * from public.check_issue('YYYY-MM-DD');`

Levels and word counts: Native 900–1,200 · C1 550–750 · B2 320–450 · B1 180–260 · A2 100–150 · A1 60–90.
