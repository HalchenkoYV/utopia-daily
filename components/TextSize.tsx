"use client";

import { useCallback, useEffect, useState } from "react";

export const TEXT_SCALES = [1, 1.1, 1.2, 1.35];

/** Remembered text-size step (0 = normal) for one part of the site, e.g. the story or the My Words panel. */
export function useTextStep(storageKey: string): [number, (delta: number) => void] {
  const [step, setStep] = useState(0);

  useEffect(() => {
    try {
      const saved = Number(window.localStorage.getItem(storageKey));
      if (saved > 0 && saved < TEXT_SCALES.length) setStep(saved);
    } catch {}
  }, [storageKey]);

  const change = useCallback(
    (delta: number) => {
      setStep((current) => {
        const next = Math.min(Math.max(current + delta, 0), TEXT_SCALES.length - 1);
        try {
          window.localStorage.setItem(storageKey, String(next));
        } catch {}
        return next;
      });
    },
    [storageKey],
  );

  return [step, change];
}

export function TextSizeButtons({ step, onChange }: { step: number; onChange: (delta: number) => void }) {
  return (
    <div className="text-size" role="group" aria-label="Text size">
      <button type="button" onClick={() => onChange(-1)} disabled={step === 0} aria-label="Smaller text">
        A−
      </button>
      <button
        type="button"
        onClick={() => onChange(1)}
        disabled={step === TEXT_SCALES.length - 1}
        aria-label="Bigger text"
      >
        A+
      </button>
    </div>
  );
}
