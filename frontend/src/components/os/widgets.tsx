"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useMemo } from "react";
import { ArrowUpRight, Bell, Command } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { PresenceDot } from "@/components/ui/presence-dot";
import { getBoard } from "@/lib/board";
import { listMembers } from "@/lib/members";
import { appMeta, type AppId } from "@/lib/apps";
import { listNotifications, type NotificationItem } from "@/lib/notifications";
import { currentUser } from "@/lib/mock";
import { useOS } from "@/stores/os";
import { relativeTime } from "@/lib/utils";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function Card({ children, onClick, className = "", delay = 0 }: { children: React.ReactNode; onClick?: () => void; className?: string; delay?: number }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: "spring", stiffness: 260, damping: 26 }}
      className={`glass-strong group flex cursor-pointer flex-col rounded-2xl border border-white/15 p-5 text-left shadow-[var(--shadow-pop)] ${className}`}
    >
      {children}
    </motion.button>
  );
}

function handleNotificationClick(n: NotificationItem) {
  const { openApp, setPendingChat, setPendingTask, setPendingSnippet, setWorkspace } = useOS.getState();

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
    setWorkspace(n.linkId);
    if (n.app) openApp(n.app as AppId);
  } else if (n.app) {
    openApp(n.app as AppId);
    if (n.app === "chat" && n.channelId) {
      setPendingChat(n.channelId);
    }
  }
}

export function DesktopWidgets() {
  const ws = useOS((s) => s.activeWorkspace);
  const openApp = useOS((s) => s.openApp);
  const user = useOS((s) => s.user);
  const onlineIds = useOS((s) => s.online);
  const firstName = (user?.displayName ?? currentUser.name).split(" ")[0];
  const membersQuery = useQuery({ queryKey: ["members", ws], queryFn: () => listMembers(ws), enabled: !!ws });
  const online = (membersQuery.data ?? []).filter((m) => onlineIds.includes(m.id) && m.id !== user?.id);
  const notifQuery = useQuery({ queryKey: ["notifications", ws], queryFn: () => listNotifications(ws), enabled: !!ws });
  const notifications = (notifQuery.data?.items ?? []).slice(0, 5);
  const boardQuery = useQuery({ queryKey: ["board", ws], queryFn: () => getBoard(ws), enabled: !!ws });

  // Tasks assigned to current user across all columns, up to 5
  const myTasks = useMemo(() => {
    if (!boardQuery.data || !user) return [];
    return boardQuery.data.columns
      .flatMap((c) => c.tasks)
      .filter((t) => t.assignee?.id === user.id)
      .slice(0, 5);
  }, [boardQuery.data, user]);

  const boardName = boardQuery.data?.name ?? "Board";

  return (
    <div className="mx-auto max-w-5xl">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 text-white">
        <h1 className="text-3xl font-semibold tracking-tight drop-shadow">{greeting()}, {firstName}.</h1>
        <p className="mt-1 flex items-center gap-2 text-white/70">
          Press
          <kbd className="inline-flex items-center gap-0.5 rounded-md border border-white/25 bg-white/10 px-1.5 py-0.5 text-xs"><Command className="h-3 w-3" />K</kbd>
          to search, or pick an app from the dock.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card onClick={() => openApp("projects")} className="sm:col-span-2" delay={0.05}>
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-semibold">My tasks in {boardName}</span>
            <ArrowUpRight className="h-4 w-4 text-muted opacity-0 transition group-hover:opacity-100" />
          </div>
          <div className="space-y-2.5 max-h-[180px] min-h-[36px] overflow-y-auto no-scrollbar">
            {myTasks.length === 0 && <span className="text-sm text-muted">No tasks assigned to you.</span>}
            {myTasks.map((t) => (
              <div key={t.id} className="flex items-center gap-3">
                <span className={`h-4 w-4 shrink-0 rounded-full border-2 ${t.columnId && t.priority === "URGENT" ? "border-danger" : t.priority === "HIGH" ? "border-orange-400" : "border-faint"}`} />
                <span className="flex-1 text-sm truncate">{t.title}</span>
                <span className="text-[10px] font-mono text-faint shrink-0">{t.taskKey}</span>
                {t.due && <span className="text-xs text-muted shrink-0">{new Date(t.due + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>}
              </div>
            ))}
          </div>
        </Card>

        <Card onClick={() => openApp("members")} delay={0.1}>
          <span className="mb-3 text-sm font-semibold">Online now · {online.length}</span>
          <div className="space-y-2.5 max-h-[180px] min-h-[36px]overflow-y-auto no-scrollbar">
            {online.map((u) => (
              <div key={u.id} className="flex items-center gap-2.5">
                <span className="relative">
                  <Avatar name={u.displayName} size={26} />
                  <PresenceDot state="online" size={8} className="absolute -bottom-0.5 -right-0.5" />
                </span>
                <span className="text-sm">{u.displayName}</span>
              </div>
            ))}
            {online.length === 0 && <span className="text-sm text-muted">No one online.</span>}
          </div>
        </Card>

        <Card className="sm:col-span-2 lg:col-span-3" delay={0.15}>
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-semibold flex items-center gap-2">
              <Bell className="h-4 w-4" /> Recent notifications
            </span>
            <ArrowUpRight className="h-4 w-4 text-muted opacity-0 transition group-hover:opacity-100" />
          </div>
          <div className="space-y-2">
            {notifications.length === 0 && <span className="text-sm text-muted">No notifications yet.</span>}
            {notifications.map((n) => {
              const meta = n.app ? appMeta(n.app as AppId) : null;
              const Icon = meta?.icon;
              const isClickable = n.type !== "project_removed" && (n.linkType || n.app);
              return (
                <div
                  key={n.id}
                  onClick={(e) => {
                    if (!isClickable) return;
                    e.stopPropagation();
                    handleNotificationClick(n);
                  }}
                  className={`flex items-center gap-3 rounded-xl px-2 py-2 -mx-2 transition-colors ${isClickable ? "hover:bg-white/10 cursor-pointer" : ""} ${!n.read ? "" : "opacity-70"}`}
                >
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white shadow-sm"
                    style={{ background: meta?.accent ?? "var(--faint)" }}
                  >
                    {Icon ? <Icon className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-tight truncate">{n.title}</p>
                    {n.body && <p className="text-xs text-muted truncate mt-0.5">{n.body}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-faint">{relativeTime(n.createdAt)}</span>
                    {!n.read && <span className="h-2 w-2 rounded-full bg-accent" />}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}

