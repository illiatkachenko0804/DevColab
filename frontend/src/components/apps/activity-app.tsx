"use client";

import { Activity as ActivityIcon, Code2, GitBranch, MessageSquare, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Avatar } from "@/components/ui/avatar";
import { cn, relativeTime } from "@/lib/utils";
import { useOS } from "@/stores/os";
import { listActivity, type Activity } from "@/lib/activity";
import { subscribe } from "@/lib/ws";

const ICON: Record<string, typeof ActivityIcon> = {
  task: ActivityIcon,
  join: UserPlus,
  snippet: Code2,
  message: MessageSquare,
  board: GitBranch,
};
const COLOR: Record<string, string> = {
  task: "var(--app-projects)",
  join: "var(--app-members)",
  snippet: "var(--app-snippets)",
  message: "var(--app-chat)",
  board: "var(--app-activity)",
};

const FILTERS = ["All", "task", "snippet", "join"] as const;

export function ActivityApp() {
  const ws = useOS((s) => s.activeWorkspace);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const qc = useQueryClient();
  
  const query = useQuery({
    queryKey: ["activity", ws],
    queryFn: () => listActivity(ws),
    enabled: !!ws,
  });

  useEffect(() => {
    if (!ws) return;
    const unsub = subscribe(`/topic/workspace.${ws}.activity`, (raw) => {
      const a = raw as Activity;
      qc.setQueryData<Activity[]>(["activity", ws], (old) => {
        if (!old) return [a];
        return [a, ...old];
      });
    });
    return () => unsub();
  }, [ws]);

  const activities = query.data ?? [];
  const rows = activities.filter((a) => filter === "All" || a.app === filter);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-separator px-4">
        <span className="font-semibold">Activity</span>
        <div className="ml-auto flex gap-1">
          {FILTERS.map((f) => (
            <button key={f} type="button" onClick={() => setFilter(f)} className={cn("cursor-pointer rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors", filter === f ? "bg-accent text-accent-foreground" : "text-muted hover:bg-hover")}>{f}</button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-4 no-scrollbar">
        <div className="mx-auto max-w-2xl">
          {rows.length === 0 && <p className="py-10 text-center text-sm text-muted">No activity yet.</p>}
          {rows.map((a, i) => {
            const Icon = ICON[a.app] || ActivityIcon;
            return (
              <div key={a.id} className="relative flex gap-4 pb-5">
                {i < rows.length - 1 && <span className="absolute left-[15px] top-9 h-full w-px bg-separator" />}
                <span className="z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white" style={{ background: COLOR[a.app] || "var(--app-activity)" }}>
                  <Icon className="h-4 w-4" />
                </span>
                <div className="flex flex-1 items-start gap-2 pt-0.5">
                  <Avatar name={a.actorName} size={22} />
                  <p className="text-sm leading-relaxed text-foreground/90">
                    <span className="font-semibold">{a.actorName}</span> {a.text}
                    <span className="ml-2 text-xs text-faint">{relativeTime(a.createdAt)} ago</span>
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
