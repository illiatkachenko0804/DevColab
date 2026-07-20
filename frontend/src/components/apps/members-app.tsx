"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { authErrorMessage } from "@/lib/auth";
import { inviteMember, listMembers, removeMember, updateMemberRole } from "@/lib/members";
import { markNotificationReadByApp } from "@/lib/notifications";
import { Select } from "@/components/ui/select";
import { getProjectSettings, viewerPermissions, type ProjectRole } from "@/lib/project-settings";
import { cn } from "@/lib/utils";
import { useOS } from "@/stores/os";

function roleValue(role: ProjectRole): string {
  return role.systemKey ?? role.name.toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/(^_|_$)/g, "");
}

export function MembersApp() {
  const ws = useOS((s) => s.activeWorkspace);
  const workspaces = useOS((s) => s.workspaces);
  const me = useOS((s) => s.user);
  const qc = useQueryClient();
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  // Mark all members notifications as read when app opens
  useEffect(() => {
    if (ws) {
      markNotificationReadByApp(ws, "members").then(() => {
        qc.invalidateQueries({ queryKey: ["notifications", ws] });
      });
    }
  }, [ws, qc]);

  const membersQuery = useQuery({
    queryKey: ["members", ws],
    queryFn: () => listMembers(ws),
    enabled: !!ws,
  });
  const members = membersQuery.data ?? [];
  const settingsQuery = useQuery({
    queryKey: ["project-settings", ws],
    queryFn: () => getProjectSettings(ws),
    enabled: !!ws,
  });
  const currentRole = workspaces.find((w) => w.id === ws)?.role;
  const role = settingsQuery.data?.roles.find((r) => roleValue(r) === currentRole);
  const permissions = role?.permissions ?? viewerPermissions();
  const canInvite = permissions.inviteMembers;
  const canRemove = permissions.removeMembers;
  const canManageRoles = permissions.manageRoles;

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

  const remove = useMutation({
    mutationFn: (userId: string) => removeMember(ws, userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["members", ws] });
      setError(null);
      setOk("Member removed");
      setTimeout(() => setOk(null), 2500);
    },
    onError: (e) => {
      setOk(null);
      setError(authErrorMessage(e).message);
    },
  });

  const changeRole = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) => updateMemberRole(ws, userId, role),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["members", ws] });
      setError(null);
      setOk("Role updated");
      setTimeout(() => setOk(null), 2500);
    },
    onError: (e) => {
      setOk(null);
      setError(authErrorMessage(e).message);
    },
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (canInvite && query.trim()) invite.mutate(query.trim());
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-separator px-4">
        <span className="font-semibold">Members</span>
        <span className="text-sm text-muted">· {members.length}</span>
      </div>

      <div className="border-b border-separator p-4">
        {canInvite && (
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
        )}
        {error && <p className="mt-2 text-sm text-danger">{error}</p>}
        {ok && <p className="mt-2 text-sm text-success">{ok}</p>}
      </div>

      <div className="flex-1 overflow-y-auto p-5 no-scrollbar">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {members.map((u) => (
            <div key={u.id} className="flex items-center gap-3 rounded-[var(--radius-card)] border border-separator bg-surface p-4 shadow-[var(--shadow-card)]">
              <Avatar url={u.avatarUrl} name={u.displayName} size={44} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{u.displayName}</p>
                {u.devTag && <p className="truncate text-xs text-muted">@{u.devTag}</p>}
              </div>
              {u.id.startsWith("pending-") ? (
                <span className="rounded-full bg-hover px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
                  PENDING
                </span>
              ) : canManageRoles && (u.role !== "ADMIN" || currentRole === "ADMIN") ? (
                <Select
                  value={u.role}
                  onChange={(val) => changeRole.mutate({ userId: u.id, role: val })}
                  disabled={changeRole.isPending}
                  variant="pill"
                  className={u.role === "ADMIN" ? "bg-accent/15 text-accent" : "bg-hover text-muted"}
                  options={
                    settingsQuery.data?.roles
                      .filter((r) => currentRole === "ADMIN" || roleValue(r) !== "ADMIN")
                      .map((r) => ({ label: r.name, value: roleValue(r) })) ?? []
                  }
                />
              ) : (
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                    u.role === "ADMIN" ? "bg-accent/15 text-accent" : "bg-hover text-muted",
                  )}
                >
                  {u.role}
                </span>
              )}
              {canRemove && u.id !== me?.id && u.role !== "ADMIN" && (
                <button
                  type="button"
                  aria-label={`Remove ${u.displayName}`}
                  onClick={() => window.confirm(`Remove ${u.displayName} from this project?`) && remove.mutate(u.id)}
                  disabled={remove.isPending}
                  className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-faint hover:bg-danger/10 hover:text-danger disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
