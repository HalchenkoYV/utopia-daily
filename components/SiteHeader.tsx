"use client";

import Link from "next/link";
import { LEVELS, levelLabel } from "@/lib/levels";
import { useSiteState } from "./SiteState";

export default function SiteHeader() {
  const { level, setLevel, toggleWords, wordsOpen } = useSiteState();
  // Saved words arrive with accounts (step 3); until then the badge stays hidden.
  const wordCount = 0;

  return (
    <header className="site-header">
      <Link href="/" className="brand-block">
        <div className="logo">
          Utopia <span className="daily">Daily</span>
        </div>
        <div className="brand-tagline">
          real fake news <span className="dim">· powered by ai</span>
        </div>
      </Link>

      <div className="level-select">
        <span className="label" id="your-level-label">
          YOUR LEVEL
        </span>
        <nav className="levels" aria-labelledby="your-level-label">
          {LEVELS.map((lvl) => (
            <button
              key={lvl}
              type="button"
              data-lvl={lvl}
              className={lvl === level ? "active" : undefined}
              aria-pressed={lvl === level}
              onClick={() => setLevel(lvl)}
            >
              {levelLabel(lvl)}
            </button>
          ))}
        </nav>
      </div>

      <div className="header-actions">
        <button type="button" className="words-toggle" onClick={toggleWords} aria-expanded={wordsOpen}>
          My Words {wordCount > 0 && <span className="count">{wordCount}</span>}
        </button>
        <Link href="/login" className="btn-ghost">
          Log in
        </Link>
        <Link href="/signup" className="btn-solid">
          Sign up
        </Link>
      </div>
    </header>
  );
}
