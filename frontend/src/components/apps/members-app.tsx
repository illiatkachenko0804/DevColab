"use client";

import { MessageSquare, UserPlus } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { PresenceDot } from "@/components/ui/presence-dot";
import { wsMembers } from "@/lib/mock";
import { cn } from "@/lib/utils";
import { useOS } from "@/stores/os";

export function MembersApp() {
  const ws = useOS((s) => s.activeWorkspace);
  const members = wsMembers(ws);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-separator px-4">
        <span className="font-semibold">Members</span>
        <span className="text-sm text-muted">· {members.length}</span>
        <button type="button" className="ml-auto flex cursor-pointer items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground transition hover:brightness-110">
          <UserPlus className="h-4 w-4" /> Invite
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-5 no-scrollbar">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {members.map((u) => (
            <div key={u.id} className="flex items-center gap-3 rounded-[var(--radius-card)] border border-separator bg-surface p-4 shadow-[var(--shadow-card)]">
              <span className="relative">
                <Avatar name={u.name} size={44} />
                <PresenceDot state={u.presence} size={11} className="absolute -bottom-0.5 -right-0.5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{u.name}</p>
                <p className="truncate text-xs text-muted">{u.title}</p>
              </div>
              <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide", u.role === "Admin" ? "bg-accent/15 text-accent" : "bg-hover text-muted")}>{u.role}</span>
              <button type="button" aria-label={`Message ${u.name}`} className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-muted transition hover:bg-hover hover:text-foreground">
                <MessageSquare className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
