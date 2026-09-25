"use client";

import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";
import MyWords from "./MyWords";
import { useSiteState } from "./SiteState";
import { TEXT_SCALES, TextSizeButtons, useTextStep } from "./TextSize";

const WIDTH_KEY = "ud-panel-width";
const DEFAULT_WIDTH = 360;
const MIN_WIDTH = 280;
const MAX_WIDTH = 720;

function maxWidth() {
  return Math.min(MAX_WIDTH, Math.round(window.innerWidth * 0.55));
}

function clampWidth(w: number) {
  return Math.round(Math.min(Math.max(w, MIN_WIDTH), maxWidth()));
}

function save(key: string, value: number) {
  try {
    window.localStorage.setItem(key, String(value));
  } catch {}
}

export default function WordsPanel() {
  const { wordsOpen } = useSiteState();
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [textStep, changeText] = useTextStep("ud-panel-text");
  const widthRef = useRef(width);
  widthRef.current = width;

  // Restore the reader's panel width.
  useEffect(() => {
    try {
      const w = Number(window.localStorage.getItem(WIDTH_KEY));
      if (w) setWidth(clampWidth(w));
    } catch {}
  }, []);

  // Drag the left edge to make the panel wider or narrower.
  function startResize(e: PointerEvent<HTMLDivElement>) {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = widthRef.current;
    let latest = startWidth;
    document.body.classList.add("resizing-panel");
    const onMove = (ev: globalThis.PointerEvent) => {
      latest = clampWidth(startWidth + (startX - ev.clientX));
      setWidth(latest);
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      document.body.classList.remove("resizing-panel");
      save(WIDTH_KEY, latest);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  function resizeWithKeys(e: KeyboardEvent<HTMLDivElement>) {
    const step = e.key === "ArrowLeft" ? 20 : e.key === "ArrowRight" ? -20 : 0;
    if (!step) return;
    e.preventDefault();
    const next = clampWidth(widthRef.current + step);
    setWidth(next);
    save(WIDTH_KEY, next);
  }

  return (
    <aside
      className={`words-panel${wordsOpen ? "" : " closed"}`}
      inert={!wordsOpen}
      style={{ "--panel-w": `${width}px` } as CSSProperties}
    >
      <div
        className="panel-resizer"
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize the My Words panel"
        aria-valuenow={width}
        aria-valuemin={MIN_WIDTH}
        aria-valuemax={MAX_WIDTH}
        tabIndex={0}
        title="Drag to resize · double-click to reset"
        onPointerDown={startResize}
        onKeyDown={resizeWithKeys}
        onDoubleClick={() => {
          setWidth(DEFAULT_WIDTH);
          save(WIDTH_KEY, DEFAULT_WIDTH);
        }}
      />
      <div className="panel-head">
        <div>
          <h2>My Words</h2>
          <div className="sub">Words you marked while reading</div>
        </div>
        <TextSizeButtons step={textStep} onChange={changeText} />
      </div>
      <div className="panel-body" style={{ zoom: TEXT_SCALES[textStep] }}>
        <MyWords variant="panel" />
      </div>
    </aside>
  );
}
