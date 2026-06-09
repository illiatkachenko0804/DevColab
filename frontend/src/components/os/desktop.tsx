"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";
import { ActivityApp } from "@/components/apps/activity-app";
import { ChatApp } from "@/components/apps/chat-app";
import { KanbanApp } from "@/components/apps/kanban-app";
import { MembersApp } from "@/components/apps/members-app";
import { SettingsApp } from "@/components/apps/settings-app";
import { SnippetsApp } from "@/components/apps/snippets-app";
import { appMeta, type AppId } from "@/lib/apps";
import { cn } from "@/lib/utils";
import { useOS } from "@/stores/os";
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

export function Desktop() {
  const activeApp = useOS((s) => s.activeApp);
  const maximized = useOS((s) => s.maximized);
  const closeApp = useOS((s) => s.closeApp);
  const minimizeApp = useOS((s) => s.minimizeApp);
  const toggleMaximize = useOS((s) => s.toggleMaximize);
  const toggleCommand = useOS((s) => s.toggleCommand);
  const setCommandOpen = useOS((s) => s.setCommandOpen);
  const setNotifOpen = useOS((s) => s.setNotifOpen);

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

  const meta = activeApp ? appMeta(activeApp) : null;

  return (
    <div
      className="relative flex h-dvh w-full flex-col overflow-hidden"
      style={{
        background:
          "radial-gradient(120% 120% at 20% 0%, #2b6cb0 0%, #1a365d 38%, #111827 100%)",
      }}
    >
      {/* Subtle aurora overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(60% 50% at 80% 10%, rgba(191,90,242,0.35), transparent 60%), radial-gradient(50% 40% at 10% 90%, rgba(10,132,255,0.35), transparent 60%)",
        }}
      />

      <MenuBar />

      <main className="relative z-10 min-h-0 flex-1">
        <AnimatePresence mode="wait">
          {meta ? (
            <motion.div
              key={meta.id}
              className={cn(
                "absolute inset-0 flex p-2 sm:p-4",
                maximized ? "p-0 sm:p-0" : "pb-20 sm:pb-24",
              )}
            >
              <WindowFrame
                title={meta.label}
                accent={meta.accent}
                onClose={() => closeApp(meta.id)}
                onMinimize={() => minimizeApp(meta.id)}
                onToggleMaximize={toggleMaximize}
                className={cn(
                  "mx-auto w-full",
                  maximized ? "max-w-none rounded-none sm:rounded-none" : "max-w-6xl",
                )}
              >
                {renderApp(meta.id)}
              </WindowFrame>
            </motion.div>
          ) : (
            <motion.div
              key="desktop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 overflow-y-auto px-6 pb-24 pt-8 no-scrollbar"
            >
              <DesktopWidgets />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <Dock />
      <CommandPalette />
      <NotificationCenter />
    </div>
  );
}
