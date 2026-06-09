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

const ICON = 46; // fixed footprint — magnification is a transform, so the bar never resizes
const RANGE = 120;

function DockIcon({ app, mouseX }: { app: AppMeta; mouseX: MotionValue<number> }) {
  const ref = useRef<HTMLButtonElement>(null);
  const openApp = useOS((s) => s.openApp);
  const windows = useOS((s) => s.windows);
  const running = windows.some((w) => w.app === app.id);
  const Icon = app.icon;

  const distance = useTransform(mouseX, (val) => {
    const b = ref.current?.getBoundingClientRect() ?? { x: 0, width: ICON };
    return val - b.x - b.width / 2;
  });
  const scaleSync = useTransform(distance, [-RANGE, 0, RANGE], [1, 1.55, 1]);
  const liftSync = useTransform(distance, [-RANGE, 0, RANGE], [0, -10, 0]);
  const spring = { stiffness: 340, damping: 22, mass: 0.5 };
  const scale = useSpring(scaleSync, spring);
  const lift = useSpring(liftSync, spring);

  return (
    <div className="group/dock relative flex flex-col items-center">
      <span className="glass-strong pointer-events-none absolute -top-10 whitespace-nowrap rounded-md border border-separator px-2 py-1 text-xs font-medium opacity-0 shadow-[var(--shadow-pop)] transition-opacity group-hover/dock:opacity-100">
        {app.label}
      </span>
      <motion.button
        ref={ref}
        type="button"
        onClick={() => openApp(app.id)}
        aria-label={app.label}
        style={{ width: ICON, height: ICON, scale, y: lift, transformOrigin: "bottom center" }}
        className="flex cursor-pointer items-center justify-center rounded-[22%] border border-white/15 shadow-md"
      >
        <span
          className="flex h-full w-full items-center justify-center rounded-[22%]"
          style={{ background: `linear-gradient(160deg, color-mix(in srgb, ${app.accent} 88%, white) 0%, ${app.accent} 100%)` }}
        >
          <Icon className="h-1/2 w-1/2 text-white drop-shadow-sm" strokeWidth={2} />
        </span>
      </motion.button>
      <span
        className="mt-1 h-1 w-1 rounded-full"
        style={{ background: running ? "var(--foreground)" : "transparent" }}
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
        className="glass-strong pointer-events-auto flex items-end gap-3 rounded-[22px] border border-white/15 px-3 py-2 shadow-[var(--shadow-dock)]"
      >
        {APPS.map((app) => (
          <DockIcon key={app.id} app={app} mouseX={mouseX} />
        ))}
      </motion.nav>
    </div>
  );
}
