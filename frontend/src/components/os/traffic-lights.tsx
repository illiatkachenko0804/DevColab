"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

/** ✕ close glyph */
function CloseGlyph() {
  return (
    <svg viewBox="0 0 10 10" className="h-2 w-2" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round">
      <path d="M2.5 2.5 L7.5 7.5 M7.5 2.5 L2.5 7.5" />
    </svg>
  );
}

/** Two diagonal triangles pointing OUTWARD to the corners (maximize). */
function MaximizeGlyph() {
  return (
    <svg viewBox="0 0 10 10" className="h-[9px] w-[9px]" fill="currentColor">
      <path d="M1 1 L4.4 1 L1 4.4 Z" />
      <path d="M9 9 L5.6 9 L9 5.6 Z" />
    </svg>
  );
}

/** Two diagonal triangles pointing INWARD to the centre (minimize). */
function MinimizeGlyph() {
  return (
    <svg viewBox="0 0 10 10" className="h-[9px] w-[9px]" fill="currentColor">
      <path d="M1 4.4 L4.4 4.4 L4.4 1 Z" />
      <path d="M9 5.6 L5.6 5.6 L5.6 9 Z" />
    </svg>
  );
}

interface Props {
  onClose?: () => void;
  onMinimize?: () => void;
  onToggleMaximize?: () => void;
  className?: string;
}

export function TrafficLights({
  onClose,
  onMinimize,
  onToggleMaximize,
  className,
}: Props) {
  const [show, setShow] = useState(false);

  const dots = [
    { key: "close", color: "var(--tl-red)", label: "Close", onClick: onClose, Glyph: CloseGlyph },
    { key: "min", color: "var(--tl-yellow)", label: "Minimize", onClick: onMinimize, Glyph: MinimizeGlyph },
    { key: "max", color: "var(--tl-green)", label: "Maximize", onClick: onToggleMaximize, Glyph: MaximizeGlyph },
  ];

  return (
    <div
      className={cn("flex items-center gap-2", className)}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {dots.map(({ key, color, label, onClick, Glyph }) => (
        <button
          key={key}
          type="button"
          aria-label={label}
          title={label}
          onClick={onClick}
          onFocus={() => setShow(true)}
          onBlur={() => setShow(false)}
          style={{ background: color }}
          className="flex h-3 w-3 cursor-pointer items-center justify-center rounded-full text-black/55 ring-1 ring-black/10 transition active:scale-90"
        >
          <span className={cn("transition-opacity duration-150", show ? "opacity-100" : "opacity-0")}>
            <Glyph />
          </span>
        </button>
      ))}
    </div>
  );
}
