"use client";

import { Bell, Check, ChevronDown, Command, LogOut, Search, Settings as SettingsIcon, User, Wifi } from "lucide-react";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/theme-toggle";
import { appMeta } from "@/lib/apps";
import { logout as apiLogout } from "@/lib/auth";
import { wsMembers, wsNotifications } from "@/lib/mock";
import { cn } from "@/lib/utils";
import { focusedApp, useOS } from "@/stores/os";

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
  const windows = useOS((s) => s.windows);
  const workspaces = useOS((s) => s.workspaces);
  const activeWorkspace = useOS((s) => s.activeWorkspace);
  const setWorkspace = useOS((s) => s.setWorkspace);
  const openApp = useOS((s) => s.openApp);
  const toggleCommand = useOS((s) => s.toggleCommand);
  const toggleNotif = useOS((s) => s.toggleNotif);
  const logout = useOS((s) => s.logout);
  const user = useOS((s) => s.user);
  const now = useClock();

  const signOut = async () => {
    try {
      await apiLogout();
    } catch {
      /* ignore — clear locally regardless */
    }
    logout();
  };

  const displayName = user?.displayName ?? "Account";
  const handle = user?.devTag ? `@${user.devTag}` : (user?.email ?? "");

  const [projOpen, setProjOpen] = useState(false);
  const [acctOpen, setAcctOpen] = useState(false);

  const ws = workspaces.find((w) => w.id === activeWorkspace) ?? workspaces[0];
  const top = focusedApp(windows);
  const appLabel = top ? appMeta(top).label : "Desktop";
  const onlineCount = wsMembers(activeWorkspace).filter((u) => u.presence === "online").length;
  const unread = wsNotifications(activeWorkspace).filter((n) => !n.read).length;
  const otherUnread = workspaces
    .filter((w) => w.id !== activeWorkspace)
    .reduce((sum, w) => sum + wsNotifications(w.id).filter((n) => !n.read).length, 0);

  const closeAll = () => {
    setProjOpen(false);
    setAcctOpen(false);
  };

  return (
    <header className="glass-strong relative z-40 flex h-7 shrink-0 items-center gap-3 border-b border-separator px-3 text-[13px]">
      {/* Click-away backdrop */}
      {(projOpen || acctOpen) && (
        <button aria-hidden tabIndex={-1} onClick={closeAll} className="fixed inset-0 z-30 cursor-default" />
      )}

      <span className="grid h-4 w-4 place-items-center rounded-[5px] bg-accent text-[10px] font-bold text-white">D</span>

      {/* Project switcher */}
      <div className="relative z-40">
        <button
          type="button"
          onClick={() => { setAcctOpen(false); setProjOpen((v) => !v); }}
          className="flex cursor-pointer items-center gap-1.5 rounded-md px-1.5 py-0.5 font-semibold transition-colors hover:bg-hover"
        >
          <span className="h-3 w-3 rounded-[4px]" style={{ background: ws?.accent }} />
          {ws?.name}
          {otherUnread > 0 && (
            <span className="grid h-4 min-w-4 place-items-center rounded-full bg-danger px-1 text-[10px] font-semibold tabular-nums text-white">
              {otherUnread > 99 ? "99+" : otherUnread}
            </span>
          )}
          <ChevronDown className="h-3 w-3 opacity-60" />
        </button>
        {projOpen && (
          <div className="glass-strong absolute left-0 top-7 w-56 overflow-hidden rounded-xl border border-separator p-1 shadow-[var(--shadow-pop)]">
            <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-faint">Switch project</p>
            {workspaces.map((w) => {
              const count = wsNotifications(w.id).filter((n) => !n.read).length;
              return (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => { setWorkspace(w.id); closeAll(); }}
                  className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-hover"
                >
                  <span className="grid h-7 w-7 place-items-center rounded-md text-xs font-semibold text-white" style={{ background: w.accent }}>{w.initial}</span>
                  <span className="flex-1 text-sm font-medium">{w.name}</span>
                  {count > 0 && (
                    <span className="grid h-5 min-w-5 place-items-center rounded-full bg-danger px-1.5 text-[11px] font-semibold tabular-nums text-white">
                      {count > 99 ? "99+" : count}
                    </span>
                  )}
                  {w.id === activeWorkspace && <Check className="h-4 w-4 text-accent" />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <span className="hidden font-medium text-foreground/70 sm:inline">{appLabel}</span>

      {/* Right cluster */}
      <div className="ml-auto flex items-center gap-1.5 text-foreground/80">
        <button
          type="button"
          onClick={toggleCommand}
          aria-label="Open command palette"
          className="flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-0.5 transition-colors hover:bg-hover"
        >
          <Search className="h-3.5 w-3.5" />
          <span className="hidden items-center gap-0.5 text-xs text-muted md:flex"><Command className="h-3 w-3" />K</span>
        </button>

        <span className="hidden items-center gap-1.5 rounded-md px-2 py-0.5 text-xs text-muted lg:flex" title={`${onlineCount} online`}>
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
          {unread > 0 && <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-danger" />}
        </button>

        <span className="hidden tabular-nums text-foreground/80 sm:block">
          {now ? now.toLocaleString(undefined, { weekday: "short", day: "numeric", month: "short" }) : ""}
        </span>
        <span className="tabular-nums">
          {now ? now.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }) : "--:--"}
        </span>

        {/* Account menu */}
        <div className="relative z-40">
          <button
            type="button"
            onClick={() => { setProjOpen(false); setAcctOpen((v) => !v); }}
            aria-label="Account menu"
            className="ml-1 flex cursor-pointer items-center rounded-full transition hover:opacity-90"
          >
            <Avatar name={displayName} size={20} />
          </button>
          {acctOpen && (
            <div className="glass-strong absolute right-0 top-7 w-56 overflow-hidden rounded-xl border border-separator p-1 shadow-[var(--shadow-pop)]">
              <div className="flex items-center gap-2.5 px-2 py-2">
                <Avatar name={displayName} size={34} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{displayName}</p>
                  <p className="truncate text-xs text-muted">{handle}</p>
                </div>
              </div>
              <div className="my-1 h-px bg-separator" />
              <button type="button" onClick={() => { openApp("settings"); closeAll(); }} className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-hover">
                <User className="h-4 w-4 text-muted" /> Profile
              </button>
              <button type="button" onClick={() => { openApp("settings"); closeAll(); }} className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-hover">
                <SettingsIcon className="h-4 w-4 text-muted" /> Settings
              </button>
              <div className="my-1 h-px bg-separator" />
              <button type="button" onClick={() => { signOut(); closeAll(); }} className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm text-danger transition-colors hover:bg-danger/10">
                <LogOut className="h-4 w-4" /> Log Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
