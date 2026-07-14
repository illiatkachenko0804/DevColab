"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { appMeta, type AppId } from "@/lib/apps";
import type { NotificationItem } from "@/lib/notifications";
import { useOS } from "@/stores/os";

/* ------------------------------------------------------------------ */
/*  Context — lets any child call `pushToast(notification)`            */
/* ------------------------------------------------------------------ */

type PushFn = (n: NotificationItem) => void;
const ToastCtx = createContext<PushFn>(() => {});
export const usePushToast = () => useContext(ToastCtx);

/* ------------------------------------------------------------------ */
/*  Provider + Renderer                                                */
/* ------------------------------------------------------------------ */

interface Toast {
  id: string;
  notification: NotificationItem;
}

const TTL = 5000;
const MAX_VISIBLE = 3;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const push: PushFn = useCallback(
    (n) => {
      const id = `toast-${n.id}-${Date.now()}`;
      setToasts((prev) => [...prev.slice(-(MAX_VISIBLE - 1)), { id, notification: n }]);
      const timer = setTimeout(() => dismiss(id), TTL);
      timers.current.set(id, timer);
    },
    [dismiss],
  );

  // Clean up timers on unmount.
  useEffect(() => {
    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      timers.current.forEach(clearTimeout);
    };
  }, []);

  return (
    <ToastCtx.Provider value={push}>
      {children}
      <ToastRenderer toasts={toasts} dismiss={dismiss} />
    </ToastCtx.Provider>
  );
}

/* ------------------------------------------------------------------ */
/*  Renderer                                                           */
/* ------------------------------------------------------------------ */

function ToastRenderer({ toasts, dismiss }: { toasts: Toast[]; dismiss: (id: string) => void }) {
  const openApp = useOS((s) => s.openApp);
  const setPendingChat = useOS((s) => s.setPendingChat);

  const handleClick = (toast: Toast) => {
    const n = toast.notification;
    if (n.linkType === "task" && n.linkId) {
      useOS.getState().setPendingTask(n.linkId);
      openApp("projects");
    } else if (n.linkType === "snippet" && n.linkId) {
      useOS.getState().setPendingSnippet(n.linkId);
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
      // Deep-link into the specific chat channel when relevant (fallback).
      if (n.app === "chat" && n.channelId) {
        setPendingChat(n.channelId);
      }
    }
    dismiss(toast.id);
  };

  return (
    <div className="pointer-events-none fixed right-3 top-9 z-[60] flex w-80 flex-col gap-2">
      <AnimatePresence mode="popLayout">
        {toasts.map((t) => {
          const n = t.notification;
          const isClickable = n.type !== "project_removed" && (n.linkType || n.app);
          const meta = n.app ? appMeta(n.app as AppId) : null;
          const Icon = meta?.icon;
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, x: 80, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 80, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 340, damping: 28 }}
              className={`glass-strong pointer-events-auto flex items-center gap-3 rounded-2xl border border-separator p-3 shadow-[var(--shadow-pop)] ${isClickable ? "cursor-pointer" : ""}`}
              onClick={() => isClickable && handleClick(t)}
              role="alert"
            >
              <span
                className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white shadow-sm"
                style={{ background: meta?.accent ?? "var(--faint)" }}
              >
                {Icon ? <Icon className="h-4.5 w-4.5" /> : <span className="text-sm font-bold">D</span>}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold leading-tight">{t.notification.title}</p>
                {t.notification.body && (
                  <p className="mt-0.5 line-clamp-2 text-xs text-muted">{t.notification.body}</p>
                )}
              </div>
              <button
                type="button"
                aria-label="Dismiss"
                onClick={(e) => {
                  e.stopPropagation();
                  dismiss(t.id);
                }}
                className="mt-0.5 flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded-full text-faint transition-colors hover:bg-hover hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
