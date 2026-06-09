"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Bell, Check } from "lucide-react";
import { useEffect, useState } from "react";
import { appMeta, type AppId } from "@/lib/apps";
import { wsNotifications, type Notification } from "@/lib/mock";
import { relativeTime } from "@/lib/utils";
import { useOS } from "@/stores/os";

export function NotificationCenter() {
  const open = useOS((s) => s.notifOpen);
  const setOpen = useOS((s) => s.setNotifOpen);
  const ws = useOS((s) => s.activeWorkspace);
  const [items, setItems] = useState<Notification[]>(wsNotifications(ws));
  const unread = items.filter((n) => !n.read).length;

  // Re-scope notifications when the project changes.
  useEffect(() => {
    setItems(wsNotifications(ws));
  }, [ws]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="fixed inset-0 z-[55]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} />
          <motion.aside
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 24 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className="glass-strong fixed right-2 top-9 z-[56] w-80 overflow-hidden rounded-2xl border border-separator shadow-[var(--shadow-pop)]"
            role="dialog"
            aria-label="Notifications"
          >
            <div className="flex items-center justify-between border-b border-separator px-4 py-3">
              <span className="flex items-center gap-2 text-sm font-semibold">
                <Bell className="h-4 w-4" /> Notifications
                {unread > 0 && <span className="rounded-full bg-danger px-1.5 text-[10px] font-semibold text-white">{unread}</span>}
              </span>
              <button type="button" onClick={() => setItems((p) => p.map((n) => ({ ...n, read: true })))} className="flex cursor-pointer items-center gap-1 text-xs text-accent hover:underline">
                <Check className="h-3 w-3" /> Mark all read
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-2 no-scrollbar">
              {items.length === 0 && <p className="px-3 py-6 text-center text-sm text-muted">You're all caught up.</p>}
              {items.map((n) => {
                const meta = appMeta(n.app as AppId);
                return (
                  <button key={n.id} type="button" onClick={() => setItems((p) => p.map((x) => (x.id === n.id ? { ...x, read: true } : x)))} className="flex w-full cursor-pointer items-start gap-3 rounded-lg px-2.5 py-2.5 text-left transition-colors hover:bg-hover">
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white" style={{ background: meta.accent }}>
                      <meta.icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{n.title}</p>
                      <p className="truncate text-xs text-muted">{n.body}</p>
                    </div>
                    <span className="flex items-center gap-2">
                      {!n.read && <span className="h-2 w-2 rounded-full bg-accent" />}
                      <span className="text-[11px] text-faint">{relativeTime(n.at)}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
