#!/usr/bin/env node
// Validates story files and prints word counts per level.
// Usage: node scripts/check-content.mjs [YYYY-MM-DD]   (no date = all days)
import fs from "node:fs";
import path from "node:path";

const CONTENT_DIR = path.join(process.cwd(), "content");
const LEVELS = ["a1", "a2", "b1", "b2", "c1"];
const TOPICS = ["Environment", "Energy", "Community", "Technology", "Culture", "Food"];
const WORD_RANGE = { a1: [60, 90], a2: [100, 150], b1: [180, 260], b2: [320, 450], c1: [550, 750] };

const countWords = (text) => text.split(/\s+/).filter((t) => /[\p{L}\p{N}]/u.test(t)).length;
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const onlyDate = process.argv[2];
const dates = fs
  .readdirSync(CONTENT_DIR)
  .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d) && (!onlyDate || d === onlyDate))
  .sort();

let problems = 0;
const problem = (msg) => {
  problems++;
  console.log(`  ✗ ${msg}`);
};

for (const date of dates) {
  const files = fs.readdirSync(path.join(CONTENT_DIR, date)).filter((f) => /^story-\d+\.json$/.test(f)).sort();
  console.log(`\n${date} — ${files.length} file(s)`);
  for (const file of files) {
    let story;
    try {
      story = JSON.parse(fs.readFileSync(path.join(CONTENT_DIR, date, file), "utf8"));
    } catch (err) {
      console.log(` ${file}`);
      problem(`invalid JSON: ${err.message}`);
      continue;
    }
    console.log(` ${file}  [${story.status}]  ${story.topic_category}`);
    if (!["draft", "published"].includes(story.status)) problem(`status must be "draft" or "published"`);
    if (!TOPICS.includes(story.topic_category)) problem(`unknown topic_category "${story.topic_category}"`);
    for (const lvl of LEVELS) {
      const c = story.levels?.[lvl];
      if (!c) {
        problem(`${lvl}: missing`);
        continue;
      }
      const words = countWords(c.body ?? "");
      const [min, max] = WORD_RANGE[lvl];
      const flag = words < min || words > max ? "✗" : "✓";
      console.log(`   ${lvl}: ${String(words).padStart(3)} words (${min}–${max}) ${flag}  vocab ${c.vocab?.length ?? 0}  “${c.title}”`);
      if (flag === "✗") problems++;
      for (const key of ["title", "excerpt", "body"]) if (!c[key]) problem(`${lvl}: empty ${key}`);
      if (!Array.isArray(c.vocab) || c.vocab.length < 5 || c.vocab.length > 8) problem(`${lvl}: vocab must have 5–8 items`);
      for (const v of c.vocab ?? []) {
        if (!v.word || !v.definition) problem(`${lvl}: vocab item without word/definition`);
        else if (!new RegExp(`(^|[^\\p{L}])${escapeRe(v.word)}([^\\p{L}]|$)`, "iu").test(c.body)) {
          problem(`${lvl}: vocab word "${v.word}" not found in body`);
        }
      }
    }
  }
}

console.log(problems ? `\n${problems} problem(s) found.` : "\nAll good.");
process.exit(problems ? 1 : 0);
