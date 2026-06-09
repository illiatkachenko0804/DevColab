"use client";

import { AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { ActivityApp } from "@/components/apps/activity-app";
import { ChatApp } from "@/components/apps/chat-app";
import { KanbanApp } from "@/components/apps/kanban-app";
import { MembersApp } from "@/components/apps/members-app";
import { SettingsApp } from "@/components/apps/settings-app";
import { SnippetsApp } from "@/components/apps/snippets-app";
import { appMeta, type AppId } from "@/lib/apps";
import { focusedApp, useOS } from "@/stores/os";
import { CommandPalette } from "./command-palette";
import { Dock } from "./dock";
import { MenuBar } from "./menu-bar";
import { NotificationCenter } from "./notification-center";
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
  const toggleCommand = useOS((s) => s.toggleCommand);
  const setCommandOpen = useOS((s) => s.setCommandOpen);
  const setNotifOpen = useOS((s) => s.setNotifOpen);

  const isMobile = useIsMobile();
  const constraintsRef = useRef<HTMLDivElement>(null);

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
  const toRender = isMobile
    ? visible.filter((w) => w.app === top)
    : visible;

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
        {/* Desktop widgets show when nothing is open */}
        {visible.length === 0 && (
          <div className="absolute inset-0 overflow-y-auto px-6 pb-24 pt-8 no-scrollbar">
            <DesktopWidgets />
          </div>
        )}

        {/* Windows layer (isolated stacking context so window z stays below dock) */}
        <div ref={constraintsRef} className="absolute inset-0 isolate">
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
                  accent={meta.accent}
                  onFocus={() => focusWindow(w.app)}
                  onClose={() => closeApp(w.app)}
                  onMinimize={() => minimizeApp(w.app)}
                  onToggleMaximize={() => toggleMaximize(w.app)}
                  onMove={(x, y) => moveWindow(w.app, x, y)}
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
