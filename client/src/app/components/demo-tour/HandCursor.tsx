import React from "react";

interface HandCursorProps {
  x: number;
  y: number;
  /** Bumped on every simulated click so the pulse ring replays. */
  clickSeq: number;
}

/**
 * The animated pointer that drives the guided demo. A fixed-position hand
 * CSS-transitions between targets; a ring keyed on `clickSeq` remounts to
 * replay the click pulse. Purely decorative — never intercepts pointer events.
 */
export const HandCursor: React.FC<HandCursorProps> = ({ x, y, clickSeq }) => (
  <>
    <span
      className="demo-tour-ring-anchor"
      style={{ transform: `translate(${x}px, ${y}px)` }}
    >
      {clickSeq > 0 && <span key={clickSeq} className="demo-tour-ring" />}
    </span>
    <span
      className="demo-tour-hand"
      aria-hidden="true"
      style={{ transform: `translate(${x - 8}px, ${y - 2}px)` }}
    >
      👆
    </span>
  </>
);
