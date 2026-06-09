"use client";

import { motion } from "framer-motion";
import { ArrowUpRight, Command } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { PresenceDot } from "@/components/ui/presence-dot";
import { activities, currentUser, tasks, userById, users } from "@/lib/mock";
import { relativeTime } from "@/lib/utils";
import { useOS } from "@/stores/os";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function Card({
  children,
  onClick,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  delay?: number;
}) {
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

export function DesktopWidgets() {
  const openApp = useOS((s) => s.openApp);
  const online = users.filter((u) => u.presence === "online");
  const today = ["t2", "t1", "t5"].map((id) => tasks[id]);

  return (
    <div className="mx-auto max-w-5xl">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 text-white">
        <h1 className="text-3xl font-semibold tracking-tight drop-shadow">
          {greeting()}, {currentUser.name.split(" ")[0]}.
        </h1>
        <p className="mt-1 flex items-center gap-2 text-white/70">
          Press
          <kbd className="inline-flex items-center gap-0.5 rounded-md border border-white/25 bg-white/10 px-1.5 py-0.5 text-xs">
            <Command className="h-3 w-3" />K
          </kbd>
          to search, or pick an app from the dock.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Today's tasks */}
        <Card onClick={() => openApp("projects")} className="sm:col-span-2" delay={0.05}>
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-semibold">Your tasks today</span>
            <ArrowUpRight className="h-4 w-4 text-muted opacity-0 transition group-hover:opacity-100" />
          </div>
          <div className="space-y-2.5">
            {today.map((t) => (
              <div key={t.id} className="flex items-center gap-3">
                <span className="h-4 w-4 rounded-full border-2 border-faint" />
                <span className="flex-1 text-sm">{t.title}</span>
                {t.due && <span className="text-xs text-muted">{t.due}</span>}
              </div>
            ))}
          </div>
        </Card>

        {/* Online now */}
        <Card onClick={() => openApp("members")} delay={0.1}>
          <span className="mb-3 text-sm font-semibold">Online now · {online.length}</span>
          <div className="space-y-2.5">
            {online.map((u) => (
              <div key={u.id} className="flex items-center gap-2.5">
                <span className="relative">
                  <Avatar name={u.name} size={26} />
                  <PresenceDot state={u.presence} size={8} className="absolute -bottom-0.5 -right-0.5" />
                </span>
                <span className="text-sm">{u.name}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Recent activity */}
        <Card onClick={() => openApp("activity")} className="sm:col-span-2 lg:col-span-3" delay={0.15}>
          <span className="mb-3 text-sm font-semibold">Recent activity</span>
          <div className="space-y-2">
            {activities.slice(0, 3).map((a) => (
              <div key={a.id} className="flex items-center gap-2 text-sm">
                <Avatar name={userById(a.actorId).name} size={20} />
                <span className="text-foreground/85">
                  <span className="font-medium">{userById(a.actorId).name.split(" ")[0]}</span> {a.text}
                </span>
                <span className="ml-auto text-xs text-faint">{relativeTime(a.at)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
