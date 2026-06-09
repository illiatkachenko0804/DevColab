"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { macSpring } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { TrafficLights } from "./traffic-lights";

interface Props {
  title: string;
  accent?: string;
  toolbar?: ReactNode; // optional center/right toolbar content
  onClose?: () => void;
  onMinimize?: () => void;
  onToggleMaximize?: () => void;
  className?: string;
  children: ReactNode;
}

/**
 * A macOS window: traffic-light controls, a translucent title bar, and a
 * content area. Used as the chrome for every app on the desktop.
 */
export function WindowFrame({
  title,
  accent,
  toolbar,
  onClose,
  onMinimize,
  onToggleMaximize,
  className,
  children,
}: Props) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.97, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97, y: 8 }}
      transition={macSpring}
      className={cn(
        "flex min-h-0 flex-col overflow-hidden rounded-[var(--radius-window)] border border-separator bg-surface shadow-[var(--shadow-window)]",
        className,
      )}
      style={accent ? ({ "--accent": accent } as React.CSSProperties) : undefined}
    >
      {/* Title bar */}
      <header
        className="glass relative flex h-11 shrink-0 items-center gap-3 border-b border-separator px-4"
        onDoubleClick={onToggleMaximize}
      >
        <TrafficLights
          onClose={onClose}
          onMinimize={onMinimize}
          onToggleMaximize={onToggleMaximize}
        />
        <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-[13px] font-medium text-foreground/80">
          {title}
        </span>
        <div className="ml-auto flex items-center gap-1.5">{toolbar}</div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </motion.div>
  );
}
