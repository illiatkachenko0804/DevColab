"use client";

import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { useRef } from "react";
import { APPS, type AppMeta } from "@/lib/apps";
import { useOS } from "@/stores/os";

const BASE = 44;
const MAX = 78;
const RANGE = 130;

function DockIcon({
  app,
  mouseX,
}: {
  app: AppMeta;
  mouseX: MotionValue<number>;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const openApp = useOS((s) => s.openApp);
  const activeApp = useOS((s) => s.activeApp);
  const openApps = useOS((s) => s.openApps);
  const isRunning = openApps.includes(app.id);
  const isActive = activeApp === app.id;
  const Icon = app.icon;

  const distance = useTransform(mouseX, (val) => {
    const b = ref.current?.getBoundingClientRect() ?? { x: 0, width: BASE };
    return val - b.x - b.width / 2;
  });
  const sizeSync = useTransform(distance, [-RANGE, 0, RANGE], [BASE, MAX, BASE]);
  const size = useSpring(sizeSync, { stiffness: 320, damping: 22, mass: 0.6 });

  return (
    <div className="group/dock relative flex flex-col items-center justify-end">
      {/* Tooltip */}
      <span className="glass-strong pointer-events-none absolute -top-9 whitespace-nowrap rounded-md border border-separator px-2 py-1 text-xs font-medium opacity-0 shadow-[var(--shadow-pop)] transition-opacity group-hover/dock:opacity-100">
        {app.label}
      </span>
      <motion.button
        ref={ref}
        type="button"
        onClick={() => openApp(app.id)}
        aria-label={app.label}
        style={{ width: size, height: size }}
        className="flex cursor-pointer items-center justify-center rounded-[22%] border border-white/15 shadow-md"
      >
        <span
          className="flex h-full w-full items-center justify-center rounded-[22%]"
          style={{
            background: `linear-gradient(160deg, color-mix(in srgb, ${app.accent} 88%, white) 0%, ${app.accent} 100%)`,
          }}
        >
          <Icon
            className="h-1/2 w-1/2 text-white drop-shadow-sm"
            strokeWidth={2}
          />
        </span>
      </motion.button>
      {/* Running indicator */}
      <span
        className="mt-1 h-1 w-1 rounded-full transition-colors"
        style={{
          background: isRunning ? "var(--foreground)" : "transparent",
          opacity: isActive ? 1 : 0.5,
        }}
      />
    </div>
  );
}

export function Dock() {
  const mouseX = useMotionValue(Number.POSITIVE_INFINITY);

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-2 z-30 flex justify-center">
      <motion.nav
        aria-label="Dock"
        onMouseMove={(e) => mouseX.set(e.clientX)}
        onMouseLeave={() => mouseX.set(Number.POSITIVE_INFINITY)}
        className="glass-strong pointer-events-auto flex items-end gap-3 rounded-[22px] border border-white/15 px-3 pb-2 pt-2 shadow-[var(--shadow-dock)]"
      >
        {APPS.map((app) => (
          <DockIcon key={app.id} app={app} mouseX={mouseX} />
        ))}
      </motion.nav>
    </div>
  );
}
