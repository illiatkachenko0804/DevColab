"use client";

import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { ActivityApp } from "@/components/apps/activity-app";
import { ChatApp } from "@/components/apps/chat-app";
import { FilesApp } from "@/components/apps/files-app";
import { KanbanApp } from "@/components/apps/kanban-app";
import { MembersApp } from "@/components/apps/members-app";
import { SettingsApp } from "@/components/apps/settings-app";
import { SnippetsApp } from "@/components/apps/snippets-app";
import { appMeta, type AppId } from "@/lib/apps";
import { fetchPresence } from "@/lib/chat";
import type { NotificationItem } from "@/lib/notifications";
import { cn } from "@/lib/utils";
import { addConnectListener, subscribe, wsConnect, wsDisconnect } from "@/lib/ws";
import { focusedApp, useOS } from "@/stores/os";
import { CommandPalette } from "./command-palette";
import { Dock } from "./dock";
import { MenuBar } from "./menu-bar";
import { NotificationCenter } from "./notification-center";
import { usePushToast } from "./toast-notifications";
import { DesktopWidgets } from "./widgets";
import { WindowFrame } from "./window-frame";

function renderApp(id: AppId) {
  switch (id) {
    case "chat":
      return <ChatApp />;
    case "projects":
      return <KanbanApp />;
    case "snippets":
      return <SnippetsApp />;
    case "activity":
      return <ActivityApp />;
    case "members":
      return <MembersApp />;
    case "files":
      return <FilesApp />;
    case "settings":
      return <SettingsApp />;
  }
}

function useIsMobile() {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const update = () => setMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return mobile;
}

export function Desktop() {
  const windows = useOS((s) => s.windows);
  const closeApp = useOS((s) => s.closeApp);
  const minimizeApp = useOS((s) => s.minimizeApp);
  const toggleMaximize = useOS((s) => s.toggleMaximize);
  const focusWindow = useOS((s) => s.focusWindow);
  const moveWindow = useOS((s) => s.moveWindow);
  const resizeWindow = useOS((s) => s.resizeWindow);
  const toggleCommand = useOS((s) => s.toggleCommand);
  const setCommandOpen = useOS((s) => s.setCommandOpen);
  const setNotifOpen = useOS((s) => s.setNotifOpen);
  const setAccent = useOS((s) => s.setAccent);

  const setOnline = useOS((s) => s.setOnline);
  const isMobile = useIsMobile();
  const constraintsRef = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();
  const pushToast = usePushToast();

  // Realtime connection + live presence + notifications for the whole session.
  useEffect(() => {
    wsConnect();
    const unsubPresence = subscribe("/topic/presence", (ids) => setOnline(ids as string[]));
    const unsubNotif = subscribe("/user/queue/notifications", (raw) => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["channels"] });
      // Show a banner toast for the incoming notification.
      if (raw && typeof raw === "object" && "id" in (raw as Record<string, unknown>)) {
        pushToast(raw as NotificationItem);
      }
    });
    // Refresh the presence snapshot on every (re)connect — by then we're online too.
    const unsubConnect = addConnectListener(() => {
      fetchPresence().then(setOnline).catch(() => {});
    });
    fetchPresence().then(setOnline).catch(() => {});
    return () => {
      unsubPresence();
      unsubNotif();
      unsubConnect();
      wsDisconnect();
    };
  }, [setOnline, qc]);

  // Restore the saved accent color.
  useEffect(() => {
    const saved = localStorage.getItem("devcollab.accent");
    if (saved) setAccent(saved);
  }, [setAccent]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        toggleCommand();
      }
      if (e.key === "Escape") {
        setCommandOpen(false);
        setNotifOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleCommand, setCommandOpen, setNotifOpen]);

  const top = focusedApp(windows);
  const visible = windows.filter((w) => !w.minimized);
  const toRender = isMobile ? visible.filter((w) => w.app === top) : visible;
  const hasWindows = visible.length > 0;

  return (
    <div
      className="relative flex h-dvh w-full flex-col overflow-hidden"
      style={{ background: "radial-gradient(120% 120% at 20% 0%, #2b6cb0 0%, #1a365d 38%, #111827 100%)" }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{ background: "radial-gradient(60% 50% at 80% 10%, rgba(191,90,242,0.35), transparent 60%), radial-gradient(50% 40% at 10% 90%, rgba(10,132,255,0.35), transparent 60%)" }}
      />

      <MenuBar />

      <main className="relative z-10 min-h-0 flex-1">
        {/* Desktop widgets stay behind open windows — dimmed + desaturated. */}
        <div
          className={cn(
            "absolute inset-0 overflow-y-auto px-6 pb-24 pt-8 no-scrollbar transition-all duration-300",
            hasWindows ? "pointer-events-none opacity-25 grayscale" : "opacity-100",
          )}
        >
          <DesktopWidgets />
        </div>

        {/* Windows layer (isolated stacking context so window z stays below dock) */}
        <div ref={constraintsRef} className="pointer-events-none absolute inset-0 isolate">
          <AnimatePresence>
            {toRender.map((w) => {
              const meta = appMeta(w.app);
              return (
                <WindowFrame
                  key={w.app}
                  win={w}
                  isMobile={isMobile}
                  constraintsRef={constraintsRef}
                  title={meta.label}
                  onFocus={() => focusWindow(w.app)}
                  onClose={() => closeApp(w.app)}
                  onMinimize={() => minimizeApp(w.app)}
                  onToggleMaximize={() => toggleMaximize(w.app)}
                  onMove={(x, y) => moveWindow(w.app, x, y)}
                  onResize={(width, height) => resizeWindow(w.app, width, height)}
                >
                  {renderApp(w.app)}
                </WindowFrame>
              );
            })}
          </AnimatePresence>
        </div>
      </main>

      <Dock />
      <CommandPalette />
      <NotificationCenter />
    </div>
  );
}
