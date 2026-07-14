"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, Check } from "lucide-react";
import { useEffect } from "react";
import { appMeta, type AppId } from "@/lib/apps";
import { listNotifications, markAllNotificationsRead } from "@/lib/notifications";
import { relativeTime } from "@/lib/utils";
import { useOS } from "@/stores/os";

export function NotificationCenter() {
  const open = useOS((s) => s.notifOpen);
  const setOpen = useOS((s) => s.setNotifOpen);
  const ws = useOS((s) => s.activeWorkspace);
  const openApp = useOS((s) => s.openApp);
  const setPendingTask = useOS((s) => s.setPendingTask);
  const setPendingSnippet = useOS((s) => s.setPendingSnippet);
  const setPendingChat = useOS((s) => s.setPendingChat);
  const qc = useQueryClient();

  const query = useQuery({ queryKey: ["notifications", ws], queryFn: () => listNotifications(ws), enabled: !!ws });
  const items = query.data?.items ?? [];
  const unread = query.data?.counts.total ?? 0;

  const markAll = useMutation({
    mutationFn: () => markAllNotificationsRead(ws),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications", ws] }),
  });

  // Opening the center marks everything seen (clears the bell + notif badges).
  useEffect(() => {
    if (open && unread > 0) markAll.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

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
              </span>
              {items.length > 0 && (
                <button type="button" onClick={() => markAll.mutate()} className="flex cursor-pointer items-center gap-1 text-xs text-accent hover:underline">
                  <Check className="h-3 w-3" /> Mark all read
                </button>
              )}
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-2 no-scrollbar">
              {items.length === 0 && <p className="px-3 py-6 text-center text-sm text-muted">You're all caught up.</p>}
              {items.map((n) => {
                const isClickable = n.type !== "project_removed" && (n.linkType || n.app);
                const meta = n.app ? appMeta(n.app as AppId) : null;
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => {
                      if (!isClickable) return;
                      if (n.linkType === "task" && n.linkId) {
                        setPendingTask(n.linkId);
                        openApp("projects");
                      } else if (n.linkType === "snippet" && n.linkId) {
                        setPendingSnippet(n.linkId);
                        openApp("snippets");
                      } else if (n.linkType === "chat" && n.linkId) {
                        setPendingChat(n.linkId);
                        openApp("chat");
                      } else if (n.linkType === "project" && n.linkId) {
                        useOS.getState().setWorkspace(n.linkId);
                        if (n.app) {
                          openApp(n.app as AppId);
                        }
                      } else if (n.app) {
                        openApp(n.app as AppId);
                      }
                      setOpen(false);
                    }}
                    className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-2.5 text-left transition-colors ${
                      isClickable ? "cursor-pointer hover:bg-hover" : ""
                    }`}
                  >
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white" style={{ background: meta?.accent ?? "var(--faint)" }}>
                      {meta ? <meta.icon className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{n.title}</p>
                      {n.body && <p className="truncate text-xs text-muted">{n.body}</p>}
                    </div>
                    <span className="flex items-center gap-2">
                      {!n.read && <span className="h-2 w-2 rounded-full bg-accent" />}
                      <span className="text-[11px] text-faint">{relativeTime(n.createdAt)}</span>
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
