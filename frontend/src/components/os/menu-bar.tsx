"use client";

import { Bell, Command, Search, Wifi } from "lucide-react";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/theme-toggle";
import { appMeta } from "@/lib/apps";
import { currentUser, notifications, users } from "@/lib/mock";
import { useOS } from "@/stores/os";

function useClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export function MenuBar() {
  const activeApp = useOS((s) => s.activeApp);
  const toggleCommand = useOS((s) => s.toggleCommand);
  const toggleNotif = useOS((s) => s.toggleNotif);
  const goToDesktop = useOS((s) => s.goToDesktop);
  const now = useClock();

  const appLabel = activeApp ? appMeta(activeApp).label : "Desktop";
  const onlineCount = users.filter((u) => u.presence === "online").length;
  const unread = notifications.filter((n) => !n.read).length;

  const menus = ["File", "Edit", "View", "Window"];

  return (
    <header className="glass-strong relative z-40 flex h-7 shrink-0 items-center gap-4 border-b border-separator px-3 text-[13px]">
      {/* Left: brand + app menus */}
      <button
        type="button"
        onClick={goToDesktop}
        className="flex cursor-pointer items-center gap-1.5 font-semibold tracking-tight"
      >
        <span className="grid h-4 w-4 place-items-center rounded-[5px] bg-accent text-[10px] text-white">
          D
        </span>
      </button>
      <span className="font-semibold">{appLabel}</span>
      <nav className="hidden items-center gap-4 text-foreground/70 sm:flex">
        {menus.map((m) => (
          <button
            key={m}
            type="button"
            className="cursor-pointer transition-colors hover:text-foreground"
          >
            {m}
          </button>
        ))}
      </nav>

      {/* Right: status cluster */}
      <div className="ml-auto flex items-center gap-1.5 text-foreground/80">
        <button
          type="button"
          onClick={toggleCommand}
          aria-label="Open command palette"
          className="flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-0.5 transition-colors hover:bg-hover"
        >
          <Search className="h-3.5 w-3.5" />
          <span className="hidden items-center gap-0.5 text-xs text-muted md:flex">
            <Command className="h-3 w-3" />K
          </span>
        </button>

        <span
          className="hidden items-center gap-1.5 rounded-md px-2 py-0.5 text-xs text-muted lg:flex"
          title={`${onlineCount} online`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-success" />
          {onlineCount}
        </span>

        <Wifi className="hidden h-3.5 w-3.5 md:block" />
        <ThemeToggle className="h-7 w-7" />

        <button
          type="button"
          onClick={toggleNotif}
          aria-label="Notifications"
          className="relative flex h-7 w-7 cursor-pointer items-center justify-center rounded-md transition-colors hover:bg-hover"
        >
          <Bell className="h-[18px] w-[18px]" />
          {unread > 0 && (
            <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-danger" />
          )}
        </button>

        <span className="hidden tabular-nums text-foreground/80 sm:block">
          {now
            ? now.toLocaleString(undefined, {
                weekday: "short",
                day: "numeric",
                month: "short",
              })
            : ""}
        </span>
        <span className="tabular-nums">
          {now
            ? now.toLocaleTimeString(undefined, {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "--:--"}
        </span>
        <Avatar name={currentUser.name} size={20} className="ml-1" />
      </div>
    </header>
  );
}
