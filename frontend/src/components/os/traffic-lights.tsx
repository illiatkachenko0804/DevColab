"use client";

import { Minus, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  onClose?: () => void;
  onMinimize?: () => void;
  onToggleMaximize?: () => void;
  className?: string;
}

const DOTS = [
  { key: "close", color: "var(--tl-red)", label: "Close", Icon: X },
  { key: "min", color: "var(--tl-yellow)", label: "Minimize", Icon: Minus },
  { key: "max", color: "var(--tl-green)", label: "Maximize", Icon: Plus },
] as const;

export function TrafficLights({
  onClose,
  onMinimize,
  onToggleMaximize,
  className,
}: Props) {
  const handlers: Record<string, (() => void) | undefined> = {
    close: onClose,
    min: onMinimize,
    max: onToggleMaximize,
  };

  return (
    <div className={cn("group/tl flex items-center gap-2", className)}>
      {DOTS.map(({ key, color, label, Icon }) => (
        <button
          key={key}
          type="button"
          aria-label={label}
          title={label}
          onClick={handlers[key]}
          style={{ background: color }}
          className="flex h-3 w-3 cursor-pointer items-center justify-center rounded-full ring-1 ring-black/10 transition active:scale-90"
        >
          <Icon
            className="h-2 w-2 text-black/55 opacity-0 transition-opacity group-hover/tl:opacity-100"
            strokeWidth={3.5}
          />
        </button>
      ))}
    </div>
  );
}
