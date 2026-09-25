"use client";

import { useId } from "react";
import { LANGUAGES, isLanguage } from "@/lib/languages";
import { useAccount } from "./Account";

/** "Translate into: [Ukrainian ▾]" — shared by the word popover and My Words. */
export default function LanguageSelect({ compact = false }: { compact?: boolean }) {
  const { translateTo, setTranslateTo } = useAccount();
  const id = useId();

  return (
    <div className={`lang-select${compact ? " compact" : ""}`}>
      <label htmlFor={id}>Translate into</label>
      <select
        id={id}
        value={translateTo ?? ""}
        onChange={(e) => {
          if (isLanguage(e.target.value)) setTranslateTo(e.target.value);
        }}
      >
        {!translateTo && (
          <option value="" disabled>
            Choose your language
          </option>
        )}
        {LANGUAGES.map((l) => (
          <option key={l.code} value={l.code}>
            {l.name}
          </option>
        ))}
      </select>
    </div>
  );
}
