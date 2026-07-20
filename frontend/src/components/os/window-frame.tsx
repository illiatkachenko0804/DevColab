"use client";

import { motion, useDragControls, useMotionValue } from "framer-motion";
import type { PointerEvent as ReactPointerEvent, ReactNode, RefObject } from "react";
import { cn } from "@/lib/utils";
import { DEFAULT_SIZE, type WinState } from "@/stores/os";
import { TrafficLights } from "./traffic-lights";

interface Props {
  win: WinState;
  isMobile: boolean;
  constraintsRef: RefObject<HTMLDivElement | null>;
  title: string;
  onFocus: () => void;
  onClose: () => void;
  onMinimize: () => void;
  onToggleMaximize: () => void;
  onMove: (x: number, y: number) => void;
  onResize: (w: number, h: number) => void;
  children: ReactNode;
}

export function WindowFrame({
  win,
  isMobile,
  constraintsRef,
  title,
  onFocus,
  onClose,
  onMinimize,
  onToggleMaximize,
  onMove,
  onResize,
  children,
}: Props) {
  const controls = useDragControls();
  const x = useMotionValue(win.x);
  const y = useMotionValue(win.y);
  const fixed = isMobile || win.maximized;

  const startResize = (e: ReactPointerEvent, dir: "e" | "s" | "se") => {
    e.preventDefault();
    e.stopPropagation();
    onFocus();
    const startX = e.clientX;
    const startY = e.clientY;
    const startW = win.w;
    const startH = win.h;
    const move = (ev: PointerEvent) => {
      const w = dir.includes("e") ? startW + (ev.clientX - startX) : startW;
      const h = dir.includes("s") ? startH + (ev.clientY - startY) : startH;
      const minW = DEFAULT_SIZE[win.app]?.w ?? 380;
      const minH = DEFAULT_SIZE[win.app]?.h ?? 320;
      onResize(Math.max(minW, w), Math.max(minH, h));
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

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
        maximized={win.maximized}
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
        style={{ zIndex: win.z }}
        className={cn(
          "pointer-events-auto absolute flex flex-col overflow-hidden border border-separator bg-surface shadow-[var(--shadow-window)]",
          isMobile ? "inset-0 rounded-none" : "inset-x-2 top-2 bottom-20 rounded-[var(--radius-window)]",
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
      style={{ x, y, width: win.w, height: win.h, zIndex: win.z }}
      className="pointer-events-auto absolute left-0 top-0 flex flex-col overflow-hidden rounded-[var(--radius-window)] border border-separator bg-surface shadow-[var(--shadow-window)]"
    >
      {Header}
      {Body}

      {/* Resize handles */}
      <div onPointerDown={(e) => startResize(e, "e")} className="absolute right-0 top-0 z-20 h-full w-1.5 cursor-ew-resize" />
      <div onPointerDown={(e) => startResize(e, "s")} className="absolute bottom-0 left-0 z-20 h-1.5 w-full cursor-ns-resize" />
      <div onPointerDown={(e) => startResize(e, "se")} className="absolute bottom-0 right-0 z-20 h-3.5 w-3.5 cursor-nwse-resize" />
    </motion.div>
  );
}
