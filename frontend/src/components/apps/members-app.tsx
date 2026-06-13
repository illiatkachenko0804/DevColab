"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { UserPlus } from "lucide-react";
import { useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { authErrorMessage } from "@/lib/auth";
import { inviteMember, listMembers } from "@/lib/members";
import { cn } from "@/lib/utils";
import { useOS } from "@/stores/os";

export function MembersApp() {
  const ws = useOS((s) => s.activeWorkspace);
  const qc = useQueryClient();
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const membersQuery = useQuery({
    queryKey: ["members", ws],
    queryFn: () => listMembers(ws),
    enabled: !!ws,
  });
  const members = membersQuery.data ?? [];

  const invite = useMutation({
    mutationFn: (q: string) => inviteMember(ws, q),
    onSuccess: (m) => {
      qc.invalidateQueries({ queryKey: ["members", ws] });
      setQuery("");
      setError(null);
      setOk(`Added ${m.displayName}`);
      setTimeout(() => setOk(null), 2500);
    },
    onError: (e) => {
      setOk(null);
      setError(authErrorMessage(e).message);
    },
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) invite.mutate(query.trim());
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-separator px-4">
        <span className="font-semibold">Members</span>
        <span className="text-sm text-muted">· {members.length}</span>
      </div>

      <div className="border-b border-separator p-4">
        <form onSubmit={submit} className="flex items-center gap-2">
          <div className="flex flex-1 items-center gap-2 rounded-lg border border-separator bg-surface px-3 focus-within:border-accent">
            <UserPlus className="h-4 w-4 text-faint" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Invite by @devtag or email"
              aria-label="Invite by devtag or email"
              className="h-9 flex-1 bg-transparent text-sm outline-none placeholder:text-faint"
            />
          </div>
          <button
            type="submit"
            disabled={invite.isPending || !query.trim()}
            className="h-9 cursor-pointer rounded-lg bg-accent px-4 text-sm font-medium text-accent-foreground transition hover:brightness-110 disabled:opacity-50"
          >
            {invite.isPending ? "Inviting…" : "Invite"}
          </button>
        </form>
        {error && <p className="mt-2 text-sm text-danger">{error}</p>}
        {ok && <p className="mt-2 text-sm text-success">{ok}</p>}
      </div>

      <div className="flex-1 overflow-y-auto p-5 no-scrollbar">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {members.map((u) => (
            <div key={u.id} className="flex items-center gap-3 rounded-[var(--radius-card)] border border-separator bg-surface p-4 shadow-[var(--shadow-card)]">
              <Avatar name={u.displayName} size={44} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{u.displayName}</p>
                <p className="truncate text-xs text-muted">@{u.devTag}</p>
              </div>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                  u.role === "ADMIN" ? "bg-accent/15 text-accent" : "bg-hover text-muted",
                )}
              >
                {u.role}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
