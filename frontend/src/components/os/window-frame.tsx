"use client";

import { motion, useDragControls, useMotionValue } from "framer-motion";
import type { ReactNode, RefObject } from "react";
import { cn } from "@/lib/utils";
import type { WinState } from "@/stores/os";
import { TrafficLights } from "./traffic-lights";

interface Props {
  win: WinState;
  isMobile: boolean;
  constraintsRef: RefObject<HTMLDivElement | null>;
  title: string;
  accent?: string;
  onFocus: () => void;
  onClose: () => void;
  onMinimize: () => void;
  onToggleMaximize: () => void;
  onMove: (x: number, y: number) => void;
  children: ReactNode;
}

export function WindowFrame({
  win,
  isMobile,
  constraintsRef,
  title,
  accent,
  onFocus,
  onClose,
  onMinimize,
  onToggleMaximize,
  onMove,
  children,
}: Props) {
  const controls = useDragControls();
  const x = useMotionValue(win.x);
  const y = useMotionValue(win.y);
  const fixed = isMobile || win.maximized;

  const accentStyle = accent ? ({ "--accent": accent } as React.CSSProperties) : undefined;

  const Header = (
    <header
      className="glass relative flex h-11 shrink-0 select-none items-center gap-3 border-b border-separator px-4"
      onPointerDown={(e) => {
        onFocus();
        if (!fixed) controls.start(e);
      }}
      onDoubleClick={onToggleMaximize}
      style={{ cursor: fixed ? "default" : "grab" }}
    >
      <TrafficLights
        onClose={onClose}
        onMinimize={onMinimize}
        onToggleMaximize={onToggleMaximize}
      />
      <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-[13px] font-medium text-foreground/80">
        {title}
      </span>
    </header>
  );

  const Body = <div className="flex min-h-0 flex-1 flex-col">{children}</div>;

  if (fixed) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onPointerDown={onFocus}
        style={{ zIndex: win.z, ...accentStyle }}
        className={cn(
          "absolute flex flex-col overflow-hidden border border-separator bg-surface shadow-[var(--shadow-window)]",
          isMobile
            ? "inset-0 rounded-none"
            : "inset-x-2 top-2 bottom-20 rounded-[var(--radius-window)]",
        )}
      >
        {Header}
        {Body}
      </motion.div>
    );
  }

  return (
    <motion.div
      drag
      dragControls={controls}
      dragListener={false}
      dragMomentum={false}
      dragElastic={0}
      dragConstraints={constraintsRef}
      onDragEnd={() => onMove(x.get(), y.get())}
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      style={{ x, y, width: win.w, height: win.h, zIndex: win.z, ...accentStyle }}
      className="absolute left-0 top-0 flex flex-col overflow-hidden rounded-[var(--radius-window)] border border-separator bg-surface shadow-[var(--shadow-window)]"
    >
      {Header}
      {Body}
    </motion.div>
  );
}
