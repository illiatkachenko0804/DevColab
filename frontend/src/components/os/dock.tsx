"use client";

import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  AnimatePresence,
  type MotionValue,
} from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { APPS, type AppId, type AppMeta } from "@/lib/apps";
import { listChannels } from "@/lib/chat";
import { listNotifications } from "@/lib/notifications";
import { useOS } from "@/stores/os";

const ICON = 46; // base footprint
const MAX = 70; // magnified footprint
const RANGE = 120;

function DockIcon({ app, mouseX, badge }: { app: AppMeta; mouseX: MotionValue<number>; badge: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const openApp = useOS((s) => s.openApp);
  const windows = useOS((s) => s.windows);
  const running = windows.some((w) => w.app === app.id);
  const Icon = app.icon;
  const [isHovered, setIsHovered] = useState(false);

  const distance = useTransform(mouseX, (val) => {
    const b = ref.current?.getBoundingClientRect() ?? { x: 0, width: ICON };
    return val - b.x - b.width / 2;
  });
  const widthSync = useTransform(distance, [-RANGE, 0, RANGE], [ICON, MAX, ICON]);
  
  // Apple Design: Use bounce and duration for momentum interactions
  const width = useSpring(widthSync, { bounce: 0.15, duration: 0.3 });

  return (
    <div 
      className="group/dock relative flex flex-col items-center"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <motion.div ref={ref} style={{ width, height: ICON }} className="relative">
        <motion.button
          type="button"
          onClick={() => openApp(app.id)}
          aria-label={app.label}
          style={{ width, height: width }}
          className="absolute bottom-0 left-0 flex items-center justify-center rounded-[22%] border border-white/15 shadow-md"
        >
          <AnimatePresence>
            {isHovered && (
              <motion.span 
                initial={{ opacity: 0, y: 10, scale: 0.9, filter: "blur(2px)" }}
                animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: 10, scale: 0.9, filter: "blur(2px)" }}
                transition={{ type: "spring", bounce: 0, duration: 0.3 }}
                className="glass-strong pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md border border-separator px-2 py-1 text-xs font-medium text-foreground shadow-[var(--shadow-pop)]"
              >
                {app.label}
              </motion.span>
            )}
          </AnimatePresence>
          <span
            className="flex h-full w-full items-center justify-center rounded-[22%]"
            style={{ background: `linear-gradient(160deg, color-mix(in srgb, ${app.accent} 88%, white) 0%, ${app.accent} 100%)` }}
          >
            <Icon className="h-1/2 w-1/2 text-white drop-shadow-sm" strokeWidth={2} />
          </span>
          {badge > 0 && (
            <span className="absolute -right-1.5 -top-1.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-danger px-1 text-[10px] font-bold tabular-nums text-white shadow-md ring-2 ring-white/40">
              {badge > 99 ? "99+" : badge}
            </span>
          )}
        </motion.button>
      </motion.div>
      <span className="mt-1 h-1 w-1 rounded-full" style={{ background: running ? "var(--foreground)" : "transparent" }} />
    </div>
  );
}

export function Dock() {
  const mouseX = useMotionValue(Number.POSITIVE_INFINITY);
  const ws = useOS((s) => s.activeWorkspace);

  const channelsQuery = useQuery({ queryKey: ["channels", ws], queryFn: () => listChannels(ws), enabled: !!ws });
  const notifQuery = useQuery({ queryKey: ["notifications", ws], queryFn: () => listNotifications(ws), enabled: !!ws });
  const chatUnread = (channelsQuery.data ?? []).reduce((sum, c) => sum + c.unread, 0);
  const counts = notifQuery.data?.counts;

  const badgeFor = (id: AppId): number => {
    if (id === "chat") return chatUnread;
    if (id === "projects") return counts?.projects ?? 0;
    if (id === "members") return counts?.members ?? 0;
    if (id === "snippets") return counts?.snippets ?? 0;
    return 0;
  };

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-2 z-30 flex justify-center">
      <motion.nav
        aria-label="Dock"
        onMouseMove={(e) => mouseX.set(e.clientX)}
        onMouseLeave={() => mouseX.set(Number.POSITIVE_INFINITY)}
        className="glass-strong pointer-events-auto flex items-end gap-3 overflow-visible rounded-[22px] border border-white/15 px-3 py-2 shadow-[var(--shadow-dock)]"
      >
        {APPS.map((app) => (
          <DockIcon key={app.id} app={app} mouseX={mouseX} badge={badgeFor(app.id)} />
        ))}
      </motion.nav>
    </div>
  );
}
