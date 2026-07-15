"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Check, FolderKanban, ImageIcon, Monitor, Moon, Paintbrush, Pencil, Plus, Shield, Sun, Trash2, User, X } from "lucide-react";
import { useTheme } from "next-themes";
import { useRef, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { PasswordStrength } from "@/components/auth/password-strength";
import { authErrorMessage, updateProfile, setPassword, setupTwoFactor, enableTwoFactor, disableTwoFactor } from "@/lib/auth";
import { evaluatePassword } from "@/lib/password";
import { fileUrl, uploadFile } from "@/lib/files";
import {
  createProjectRole,
  archiveProject,
  deleteProject,
  exportProjectData,
  getProjectSettings,
  PERMISSION_KEYS,
  PERMISSION_LABELS,
  updateProjectRole,
  updateProjectSettings,
  viewerPermissions,
  type PermissionKey,
  type ProjectRole,
  type ProjectSettings,
} from "@/lib/project-settings";
import { cn } from "@/lib/utils";
import { listMyWorkspaces } from "@/lib/workspaces";
import { useOS } from "@/stores/os";

const CATEGORIES = [
  { id: "profile", label: "Profile", icon: User, color: "var(--app-chat)" },
  { id: "security", label: "Security", icon: Shield, color: "#ef4444" },
  { id: "appearance", label: "Appearance", icon: Paintbrush, color: "var(--app-snippets)" },
  { id: "notifications", label: "Notifications", icon: Bell, color: "var(--app-projects)" },
  { id: "project", label: "Project", icon: FolderKanban, color: "var(--app-members)" },
] as const;

const ACCENTS = [
  { name: "Blue", value: "#007aff" },
  { name: "Purple", value: "#bf5af2" },
  { name: "Pink", value: "#ff375f" },
  { name: "Orange", value: "#ff9f0a" },
  { name: "Green", value: "#30d158" },
  { name: "Graphite", value: "#8e8e93" },
];

function Toggle({ defaultOn = false, label }: { defaultOn?: boolean; label: string }) {
  const [on, setOn] = useState(defaultOn);
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => setOn((v) => !v)}
      className={cn(
        "relative h-6 w-10 shrink-0 cursor-pointer rounded-full transition-colors",
        on ? "bg-success" : "bg-faint/40",
      )}
    >
      <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all", on ? "left-[18px]" : "left-0.5")} />
    </button>
  );
}

function Row({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-separator py-3 last:border-0">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {desc && <p className="text-xs text-muted">{desc}</p>}
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted">{label}</span>
      {children}
    </label>
  );
}

const inputClass = "h-9 w-full rounded-lg border border-separator bg-surface px-3 text-sm outline-none focus:border-accent disabled:opacity-60";
const selectClass = "h-9 w-full cursor-pointer rounded-lg border border-separator bg-surface px-3 text-sm outline-none focus:border-accent disabled:opacity-60";
const textareaClass = "w-full resize-none rounded-lg border border-separator bg-surface px-3 py-2 text-sm outline-none focus:border-accent disabled:opacity-60";

function SwitchControl({ value, disabled, onChange, label }: { value: boolean; disabled?: boolean; onChange: (value: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!value)}
      className={cn(
        "relative h-6 w-10 shrink-0 cursor-pointer rounded-full transition-colors disabled:cursor-default disabled:opacity-50",
        value ? "bg-success" : "bg-faint/40",
      )}
    >
      <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all", value ? "left-[18px]" : "left-0.5")} />
    </button>
  );
}

function PermissionSwitch({ permission, value, disabled, onChange }: { permission: PermissionKey; value: boolean; disabled?: boolean; onChange: (value: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-separator bg-surface px-3 py-2">
      <span className="text-sm">{PERMISSION_LABELS[permission]}</span>
      <SwitchControl value={value} disabled={disabled} label={PERMISSION_LABELS[permission]} onChange={onChange} />
    </div>
  );
}

function EditableAvatar({
  name,
  url,
  workspaceId,
  disabled,
  size = 72,
  onChange,
}: {
  name: string;
  url: string | null;
  workspaceId?: string | null;
  disabled?: boolean;
  size?: number;
  onChange: (url: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const canUpload = !!workspaceId && !disabled && !uploading;

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !workspaceId) return;
    try {
      setUploading(true);
      const uploaded = await uploadFile(workspaceId, file, true, true);
      onChange(fileUrl(uploaded.id));
      setOpen(false);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="relative inline-flex">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className="group relative cursor-pointer disabled:cursor-default"
        aria-label="Edit image"
      >
        <Avatar name={name} url={url} size={size} />
        {!disabled && (
          <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/35 opacity-0 transition group-hover:opacity-100">
            <Pencil className="h-4 w-4 text-white" />
          </span>
        )}
      </button>
      <input ref={inputRef} type="file" className="hidden" accept="image/*" onChange={handleUpload} />
      {open && !disabled && (
        <div className="absolute left-0 top-full z-30 mt-2 w-44 rounded-lg border border-separator bg-surface p-1 shadow-[var(--shadow-card)]">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={!canUpload}
            className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm hover:bg-hover disabled:cursor-default disabled:opacity-50"
          >
            <ImageIcon className="h-4 w-4" />
            {uploading ? "Uploading..." : url ? "Edit image" : "Set image"}
          </button>
          {url && (
            <button
              type="button"
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
              className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-danger hover:bg-danger/10"
            >
              <Trash2 className="h-4 w-4" />
              Delete image
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function RoleDialog({
  role,
  pending,
  onClose,
  onSave,
}: {
  role: ProjectRole | null;
  pending: boolean;
  onClose: () => void;
  onSave: (body: { name: string; description?: string; permissions: Record<PermissionKey, boolean> }) => void;
}) {
  const [name, setName] = useState(role?.name ?? "");
  const [description, setDescription] = useState(role?.description ?? "");
  const [permissions, setPermissions] = useState<Record<PermissionKey, boolean>>(role?.permissions ?? viewerPermissions());

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm sm:p-6">
      <div className="flex max-h-full w-full max-w-md flex-col overflow-hidden rounded-xl border border-separator bg-surface shadow-[var(--shadow-card)]">
        <div className="flex shrink-0 items-center justify-between border-b border-separator px-4 py-3">
          <h3 className="text-base font-semibold">{role ? "Edit role" : "Add role"}</h3>
          <button type="button" onClick={onClose} aria-label="Close" className="cursor-pointer rounded-md p-1 text-muted hover:bg-hover hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="shrink-0 border-b border-separator p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Role name"><input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} /></Field>
            <Field label="Description"><input value={description} onChange={(e) => setDescription(e.target.value)} className={inputClass} /></Field>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4 no-scrollbar">
          <div className="grid grid-cols-1 gap-2">
          {PERMISSION_KEYS.map((permission) => (
            <PermissionSwitch
              key={permission}
              permission={permission}
              value={permissions[permission]}
              onChange={(checked) => setPermissions((p) => ({ ...p, [permission]: checked }))}
            />
          ))}
          </div>
        </div>
        <div className="flex shrink-0 justify-end gap-2 border-t border-separator p-3">
          <button type="button" onClick={onClose} className="cursor-pointer rounded-lg border border-separator px-4 py-2 text-sm hover:bg-hover">Cancel</button>
          <button
            type="button"
            onClick={() => onSave({ name: name.trim(), description: description.trim() || undefined, permissions })}
            disabled={pending || name.trim().length < 2}
            className="cursor-pointer rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition hover:brightness-110 disabled:opacity-50"
          >
            {pending ? "Saving..." : "Save role"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ProjectPane({ ws }: { ws: string }) {
  const qc = useQueryClient();
  const workspaces = useOS((s) => s.workspaces);
  const setWorkspaces = useOS((s) => s.setWorkspaces);
  const currentWorkspace = workspaces.find((w) => w.id === ws);

  const query = useQuery({ queryKey: ["project-settings", ws], queryFn: () => getProjectSettings(ws), enabled: !!ws });
  if (!query.data) return <p className="text-sm text-muted">Loading project settings...</p>;
  const role = query.data.roles.find((r) => roleValue(r) === currentWorkspace?.role) ?? null;
  const permissions = role?.permissions ?? viewerPermissions();
  const isAdmin = currentWorkspace?.role === "ADMIN";

  return (
    <ProjectSettingsForm
      key={query.data.id}
      ws={ws}
      settings={query.data}
      isAdmin={isAdmin}
      permissions={permissions}
      onSaved={async () => {
        qc.invalidateQueries({ queryKey: ["project-settings", ws] });
        listMyWorkspaces().then(setWorkspaces).catch(() => {});
      }}
    />
  );
}

function roleValue(role: ProjectRole): string {
  return role.systemKey ?? role.name.toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/(^_|_$)/g, "");
}

function ProjectSettingsForm({
  ws,
  settings,
  isAdmin,
  permissions,
  onSaved,
}: {
  ws: string;
  settings: ProjectSettings;
  isAdmin: boolean;
  permissions: Record<PermissionKey, boolean>;
  onSaved: () => void;
}) {
  const qc = useQueryClient();
  const setWorkspaces = useOS((s) => s.setWorkspaces);
  const setWorkspace = useOS((s) => s.setWorkspace);
  const [name, setName] = useState(settings.name);
  const [description, setDescription] = useState(settings.description ?? "");
  const [avatarUrl, setAvatarUrl] = useState(settings.avatarUrl ?? "");
  const [taskKeyPrefix, setTaskKeyPrefix] = useState(settings.taskKeyPrefix ?? "");
  const [defaultTaskType, setDefaultTaskType] = useState(settings.defaultTaskType);
  const [defaultTaskPriority, setDefaultTaskPriority] = useState(settings.defaultTaskPriority);
  const [defaultSprintDays, setDefaultSprintDays] = useState(String(settings.defaultSprintDays));
  const [invitePolicy, setInvitePolicy] = useState(settings.invitePolicy);
  const [defaultRole, setDefaultRole] = useState(settings.defaultRole);
  const [roleDialog, setRoleDialog] = useState<ProjectRole | null | "new">(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const canManageProject = permissions.manageProject;
  const canManageRoles = permissions.manageRoles;
  const currentWorkspace = useOS((s) => s.workspaces.find((w) => w.id === ws));
  const canArchiveProject = currentWorkspace?.role === "ADMIN";
  const canExportData = permissions.exportData;

  const save = useMutation({
    mutationFn: () => updateProjectSettings(ws, {
      name,
      description,
      avatarUrl,
      taskKeyPrefix,
      defaultTaskType,
      defaultTaskPriority,
      defaultSprintDays: Number(defaultSprintDays),
      invitePolicy,
      defaultRole,
    }),
    onSuccess: () => {
      setMessage("Project saved");
      setError(null);
      onSaved();
    },
    onError: (e) => {
      setMessage(null);
      setError(authErrorMessage(e).message);
    },
  });

  const createRole = useMutation({
    mutationFn: (body: { name: string; description?: string; permissions: Record<PermissionKey, boolean> }) => createProjectRole(ws, body),
    onSuccess: () => {
      setRoleDialog(null);
      setMessage("Role added");
      setError(null);
      qc.invalidateQueries({ queryKey: ["project-settings", ws] });
    },
    onError: (e) => {
      setMessage(null);
      setError(authErrorMessage(e).message);
    },
  });

  const updateRole = useMutation({
    mutationFn: ({ roleId, body }: { roleId: string; body: { name: string; description?: string; permissions: Record<PermissionKey, boolean> } }) => updateProjectRole(ws, roleId, body),
    onSuccess: () => {
      setRoleDialog(null);
      setMessage("Role saved");
      setError(null);
      qc.invalidateQueries({ queryKey: ["project-settings", ws] });
    },
    onError: (e) => {
      setMessage(null);
      setError(authErrorMessage(e).message);
    },
  });

  const archive = useMutation({
    mutationFn: () => archiveProject(ws),
    onSuccess: () => {
      setMessage("Project archived");
      setError(null);
      onSaved();
    },
    onError: (e) => {
      setMessage(null);
      setError(authErrorMessage(e).message);
    },
  });

  const remove = useMutation({
    mutationFn: () => deleteProject(ws),
    onSuccess: async () => {
      const next = await listMyWorkspaces();
      setWorkspaces(next);
      if (next[0]) setWorkspace(next[0].id);
    },
    onError: (e) => {
      setMessage(null);
      setError(authErrorMessage(e).message);
    },
  });

  const exportData = async () => {
    try {
      const data = await exportProjectData(ws);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${settings.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "project"}-export.json`;
      a.click();
      URL.revokeObjectURL(url);
      setMessage("Export downloaded");
      setError(null);
    } catch (e) {
      setMessage(null);
      setError(authErrorMessage(e).message);
    }
  };

  return (
    <section>
      <h2 className="mb-4 text-lg font-semibold">Project</h2>
      {error && <div className="mb-3 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</div>}
      {message && <div className="mb-3 rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">{message}</div>}

      <div className="space-y-6">
        <div>
          <h3 className="mb-3 text-sm font-semibold text-muted">General</h3>
          <div className="mb-4 flex items-center gap-4">
            <EditableAvatar name={name || "Project"} url={avatarUrl || null} workspaceId={ws} disabled={!canManageProject} onChange={(value) => setAvatarUrl(value ?? "")} />
            <div className="min-w-0">
              <p className="truncate text-base font-semibold">{name || "Project"}</p>
              <p className="text-sm text-muted">Project image</p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3">
            <Field label="Project name"><input value={name} onChange={(e) => setName(e.target.value)} disabled={!canManageProject} className={inputClass} /></Field>
            <Field label="Description"><textarea value={description} onChange={(e) => setDescription(e.target.value)} disabled={!canManageProject} rows={3} className={textareaClass} /></Field>
          </div>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold text-muted">Tasks</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Task key prefix"><input value={taskKeyPrefix} onChange={(e) => setTaskKeyPrefix(e.target.value.toUpperCase())} disabled={!canManageProject} placeholder="DEV" className={inputClass} /></Field>
            <Field label="Default sprint length"><input type="number" min={1} max={90} value={defaultSprintDays} onChange={(e) => setDefaultSprintDays(e.target.value)} disabled={!canManageProject} className={inputClass} /></Field>
            <Field label="Default task type">
              <select value={defaultTaskType} onChange={(e) => setDefaultTaskType(e.target.value as ProjectSettings["defaultTaskType"])} disabled={!canManageProject} className={selectClass}>
                <option value="TASK">Task</option>
                <option value="BUG">Bug</option>
                <option value="STORY">Story</option>
                <option value="EPIC">Epic</option>
              </select>
            </Field>
            <Field label="Default priority">
              <select value={defaultTaskPriority} onChange={(e) => setDefaultTaskPriority(e.target.value as ProjectSettings["defaultTaskPriority"])} disabled={!canManageProject} className={selectClass}>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </Field>
          </div>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold text-muted">Access</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Invite policy">
              <select value={invitePolicy} onChange={(e) => setInvitePolicy(e.target.value as ProjectSettings["invitePolicy"])} disabled={!canManageProject} className={selectClass}>
                <option value="ADMINS">Admins only</option>
                <option value="MAINTAINERS">Admins and maintainers</option>
              </select>
            </Field>
            <Field label="Default role">
              <select value={defaultRole} onChange={(e) => setDefaultRole(e.target.value)} disabled={!canManageProject} className={selectClass}>
                {settings.roles.map((role) => <option key={role.id} value={roleValue(role)}>{role.name}</option>)}
              </select>
            </Field>
          </div>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold text-muted">Project actions</h3>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {canExportData && (
              <button type="button" onClick={exportData} className="rounded-lg border border-separator px-3 py-2 text-sm hover:bg-hover">Export data</button>
            )}
            {canArchiveProject && (
              <button
                type="button"
                onClick={() => window.confirm("Archive this project?") && archive.mutate()}
                disabled={archive.isPending || settings.archived}
                className="rounded-lg border border-warning/40 px-3 py-2 text-sm text-warning hover:bg-warning/10 disabled:opacity-50"
              >
                {settings.archived ? "Archived" : "Archive project"}
              </button>
            )}
            {isAdmin && (
              <button
                type="button"
                onClick={() => window.confirm("Delete this project permanently?") && remove.mutate()}
                disabled={remove.isPending}
                className="rounded-lg border border-danger/40 px-3 py-2 text-sm text-danger hover:bg-danger/10 disabled:opacity-50"
              >
                Delete project
              </button>
            )}
          </div>
        </div>

        {canManageProject && (
          <button type="button" onClick={() => save.mutate()} disabled={save.isPending || !name.trim()} className="cursor-pointer rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition hover:brightness-110 disabled:opacity-50">
            {save.isPending ? "Saving..." : "Save project"}
          </button>
        )}

        <div className="border-t border-separator pt-6">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-muted"><Shield className="h-4 w-4" /> Roles</h3>
            <button
              type="button"
              onClick={() => setRoleDialog("new")}
              disabled={!canManageRoles}
              className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-separator px-3 py-1.5 text-sm hover:bg-hover disabled:cursor-default disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              Add role
            </button>
          </div>
          <div className="space-y-3">
            {settings.roles.map((role) => (
              <div key={role.id} className="flex items-center justify-between gap-3 rounded-xl border border-separator bg-surface p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{role.name}</p>
                  {role.description && <p className="mt-0.5 line-clamp-2 text-xs text-muted">{role.description}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {role.systemKey && <span className="rounded-full bg-hover px-2 py-0.5 text-[10px] font-semibold text-muted">{role.systemKey}</span>}
                  {role.systemKey !== "ADMIN" && (
                    <button
                      type="button"
                      onClick={() => setRoleDialog(role)}
                      disabled={!canManageRoles}
                      className="flex cursor-pointer items-center gap-1 rounded-lg border border-separator px-2.5 py-1.5 text-xs hover:bg-hover disabled:cursor-default disabled:opacity-50"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      {roleDialog && (
        <RoleDialog
          key={roleDialog === "new" ? "new" : roleDialog.id}
          role={roleDialog === "new" ? null : roleDialog}
          pending={createRole.isPending || updateRole.isPending}
          onClose={() => setRoleDialog(null)}
          onSave={(body) => {
            if (roleDialog === "new") createRole.mutate(body);
            else updateRole.mutate({ roleId: roleDialog.id, body });
          }}
        />
      )}
    </section>
  );
}

export function SettingsApp() {
  const [cat, setCat] = useState<(typeof CATEGORIES)[number]["id"]>("appearance");
  const { theme, setTheme } = useTheme();
  const accent = useOS((s) => s.accent);
  const setAccent = useOS((s) => s.setAccent);
  const user = useOS((s) => s.user);
  const updateUser = useOS((s) => s.updateUser);
  const activeWorkspace = useOS((s) => s.activeWorkspace);
  const qc = useQueryClient();
  const email = user?.email ?? "";

  const [pName, setPName] = useState(user?.displayName ?? "");
  const [pTag, setPTag] = useState(user?.devTag ?? "");
  const [pAvatarUrl, setPAvatarUrl] = useState(user?.avatarUrl ?? "");
  
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdSaved, setPwdSaved] = useState(false);
  const [pwdError, setPwdError] = useState<string | null>(null);

  const pw = evaluatePassword(newPassword);
  const matches = newPassword.length > 0 && newPassword === confirmPassword;

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [tfaSetupUri, setTfaSetupUri] = useState<string | null>(null);
  const [tfaCode, setTfaCode] = useState("");
  const [tfaLoading, setTfaLoading] = useState(false);
  const [tfaError, setTfaError] = useState<string | null>(null);

  const dirty = pName !== (user?.displayName ?? "") || pTag !== (user?.devTag ?? "") || pAvatarUrl !== (user?.avatarUrl ?? "");

  const handleSetup2FA = async () => {
    setTfaLoading(true);
    setTfaError(null);
    try {
      const res = await setupTwoFactor();
      setTfaSetupUri(res.qrCodeUri);
    } catch (e) {
      setTfaError(authErrorMessage(e).message);
    } finally {
      setTfaLoading(false);
    }
  };

  const handleEnable2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setTfaLoading(true);
    setTfaError(null);
    try {
      await enableTwoFactor(tfaCode);
      if (user) updateUser({ ...user, twoFactorEnabled: true });
      setTfaSetupUri(null);
      setTfaCode("");
    } catch (err) {
      setTfaError(authErrorMessage(err).message);
    } finally {
      setTfaLoading(false);
    }
  };

  const handleDisable2FA = async () => {
    setTfaLoading(true);
    setTfaError(null);
    try {
      await disableTwoFactor();
      if (user) updateUser({ ...user, twoFactorEnabled: false });
    } catch (e) {
      setTfaError(authErrorMessage(e).message);
    } finally {
      setTfaLoading(false);
    }
  };

  const saveProfile = async () => {
    setSaving(true);
    setProfileError(null);
    setSaved(false);
    try {
      const updated = await updateProfile({ displayName: pName.trim(), devTag: pTag.trim(), avatarUrl: pAvatarUrl || null });
      updateUser(updated);
      qc.invalidateQueries({ queryKey: ["members"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setProfileError(authErrorMessage(e).message);
    } finally {
      setSaving(false);
    }
  };

  const savePassword = async () => {
    setPwdSaving(true);
    setPwdError(null);
    setPwdSaved(false);
    try {
      await setPassword(oldPassword || undefined, newPassword);
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPwdSaved(true);
      if (user) {
        updateUser({ ...user, hasPassword: true });
      }
      setTimeout(() => setPwdSaved(false), 2000);
    } catch (e) {
      setPwdError(authErrorMessage(e).message);
    } finally {
      setPwdSaving(false);
    }
  };

  const themeOptions = [
    { id: "light", label: "Light", icon: Sun },
    { id: "dark", label: "Dark", icon: Moon },
    { id: "system", label: "Auto", icon: Monitor },
  ];

  return (
    <div className="relative flex min-h-0 flex-1 overflow-hidden">
      {/* Sidebar categories */}
      <div className="w-52 shrink-0 border-r border-separator bg-sidebar p-2">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setCat(c.id)}
            className={cn(
              "flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors",
              cat === c.id ? "bg-accent text-accent-foreground" : "text-foreground/80 hover:bg-hover",
            )}
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-md text-white" style={{ background: c.color }}>
              <c.icon className="h-3.5 w-3.5" />
            </span>
            {c.label}
          </button>
        ))}
      </div>

      {/* Pane */}
      <div className="flex-1 overflow-y-auto p-6 no-scrollbar">
        <div className="mx-auto max-w-xl">
          {cat === "profile" && (
            <section>
              <div className="mb-6 flex items-center gap-4">
                <EditableAvatar
                  name={pName || email}
                  url={pAvatarUrl || null}
                  workspaceId={activeWorkspace}
                  size={64}
                  onChange={(value) => setPAvatarUrl(value ?? "")}
                />
                <div>
                  <p className="text-lg font-semibold">{pName || "Your name"}</p>
                  <p className="text-sm text-muted">@{pTag || "devtag"}</p>
                </div>
              </div>

              {profileError && (
                <div className="mb-3 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
                  {profileError}
                </div>
              )}

              <Row label="Display name">
                <input
                  value={pName}
                  onChange={(e) => setPName(e.target.value)}
                  maxLength={100}
                  className="w-56 rounded-lg border border-separator bg-surface px-3 py-1.5 text-sm outline-none focus:border-accent"
                />
              </Row>
              <Row label="DevTag" desc="Your unique @handle">
                <div className="flex w-56 items-center rounded-lg border border-separator bg-surface focus-within:border-accent">
                  <span className="pl-3 text-sm text-muted">@</span>
                  <input
                    value={pTag}
                    onChange={(e) => setPTag(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                    maxLength={30}
                    placeholder="devtag"
                    className="w-full bg-transparent px-1 py-1.5 text-sm outline-none placeholder:text-faint"
                  />
                </div>
              </Row>
              <Row label="Email" desc="Used for sign-in and notifications">
                <span className="text-sm text-muted">{email}</span>
              </Row>

              <div className="mt-5 flex items-center gap-3">
                <button
                  type="button"
                  onClick={saveProfile}
                  disabled={saving || !dirty || pTag.length < 3 || pName.trim().length < 1}
                  className="cursor-pointer rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition hover:brightness-110 disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Save changes"}
                </button>
                {saved && (
                  <span className="flex items-center gap-1 text-sm text-success">
                    <Check className="h-4 w-4" /> Saved
                  </span>
                )}
              </div>
            </section>
          )}

          {cat === "security" && (
            <section>
              <h2 className="mb-4 text-lg font-semibold">Security</h2>
              
              <div className="mb-6 rounded-xl border border-separator bg-surface p-4">
                <h3 className="mb-1 font-semibold">{user?.hasPassword ? "Change Password" : "Set Password"}</h3>
                <p className="mb-4 text-sm text-muted">
                  {user?.hasPassword
                    ? "Update your password to keep your account secure."
                    : "Since you signed up with GitHub, you can set a password here to log in using your email later."}
                </p>

                {pwdError && (
                  <div className="mb-4 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
                    {pwdError}
                  </div>
                )}

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    savePassword();
                  }}
                  className="space-y-4"
                >
                  {user?.hasPassword && (
                    <Field label="Current Password">
                      <input
                        type="password"
                        required
                        value={oldPassword}
                        onChange={(e) => setOldPassword(e.target.value)}
                        className={inputClass}
                      />
                    </Field>
                  )}
                  
                  <div>
                    <Field label="New Password">
                      <input
                        type="password"
                        required
                        minLength={8}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className={inputClass}
                      />
                    </Field>
                    <div className="mt-1">
                      <PasswordStrength password={newPassword} />
                    </div>
                  </div>

                  <Field label="Confirm Password">
                    <div className="relative">
                      <input
                        type="password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className={cn(inputClass, confirmPassword && !matches && "border-danger")}
                      />
                      {matches && (
                        <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-success" />
                      )}
                    </div>
                  </Field>
                  {confirmPassword && !matches && (
                    <p className="-mt-3 text-xs text-danger">Passwords do not match</p>
                  )}

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={pwdSaving || !pw.valid || !matches || (user?.hasPassword && !oldPassword)}
                      className="cursor-pointer rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition hover:brightness-110 disabled:opacity-50"
                    >
                      {pwdSaving ? "Saving…" : "Save Password"}
                    </button>
                    {pwdSaved && (
                      <span className="flex items-center gap-1 text-sm text-success">
                        <Check className="h-4 w-4" /> Saved
                      </span>
                    )}
                  </div>
                </form>
              </div>

              <div className="mt-8 rounded-xl border border-separator bg-surface p-6">
                <h3 className="mb-4 text-base font-semibold">Two-Factor Authentication (2FA)</h3>
                
                {user?.twoFactorEnabled ? (
                  <div className="space-y-4">
                    <p className="text-sm text-faint">
                      Two-factor authentication is currently <strong>enabled</strong>. Your account is secured with a TOTP authenticator app.
                    </p>
                    <button
                      type="button"
                      onClick={handleDisable2FA}
                      disabled={tfaLoading}
                      className="cursor-pointer rounded-lg bg-danger/10 px-4 py-2 text-sm font-semibold text-danger transition hover:bg-danger/20 disabled:opacity-50"
                    >
                      Disable 2FA
                    </button>
                    {tfaError && <p className="text-sm text-danger">{tfaError}</p>}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm text-faint">
                      Secure your account by requiring a 6-digit code from your authenticator app when you log in.
                    </p>
                    
                    {!tfaSetupUri ? (
                      <button
                        type="button"
                        onClick={handleSetup2FA}
                        disabled={tfaLoading}
                        className="cursor-pointer rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition hover:brightness-110 disabled:opacity-50"
                      >
                        Set up 2FA
                      </button>
                    ) : (
                      <form onSubmit={handleEnable2FA} className="space-y-4 rounded-lg border p-4">
                        <p className="text-sm">1. Scan this QR code with your authenticator app (like Google Authenticator or Authy):</p>
                        <div className="flex justify-center rounded-lg bg-white p-4 w-max mx-auto">
                          <img src={tfaSetupUri} alt="2FA QR Code" className="h-40 w-40" />
                        </div>
                        <Field label="2. Enter the 6-digit code to verify:">
                          <input
                            type="text"
                            required
                            pattern="\d{6}"
                            maxLength={6}
                            value={tfaCode}
                            onChange={(e) => setTfaCode(e.target.value)}
                            placeholder="000000"
                            className={inputClass}
                          />
                        </Field>
                        
                        <div className="flex items-center gap-3 pt-2">
                          <button
                            type="submit"
                            disabled={tfaLoading || tfaCode.length !== 6}
                            className="cursor-pointer rounded-lg bg-success px-4 py-2 text-sm font-semibold text-success-foreground transition hover:brightness-110 disabled:opacity-50"
                          >
                            Verify & Enable
                          </button>
                          <button
                            type="button"
                            onClick={() => { setTfaSetupUri(null); setTfaCode(""); }}
                            className="cursor-pointer rounded-lg px-4 py-2 text-sm font-medium hover:bg-hover"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    )}
                    {tfaError && <p className="text-sm text-danger">{tfaError}</p>}
                  </div>
                )}
              </div>
            </section>
          )}

          {cat === "appearance" && (
            <section>
              <h2 className="mb-4 text-lg font-semibold">Appearance</h2>
              <p className="mb-2 text-sm font-medium">Theme</p>
              <div className="mb-6 grid grid-cols-3 gap-2">
                {themeOptions.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTheme(t.id)}
                    className={cn(
                      "flex cursor-pointer flex-col items-center gap-2 rounded-xl border p-4 transition-colors",
                      theme === t.id ? "border-accent bg-accent/5" : "border-separator hover:bg-hover",
                    )}
                  >
                    <t.icon className="h-5 w-5" />
                    <span className="text-sm">{t.label}</span>
                  </button>
                ))}
              </div>
              <p className="mb-2 text-sm font-medium">Accent color</p>
              <div className="flex gap-3">
                {ACCENTS.map((a) => (
                  <button
                    key={a.value}
                    type="button"
                    onClick={() => setAccent(a.value)}
                    aria-label={a.name}
                    title={a.name}
                    className={cn(
                      "h-8 w-8 cursor-pointer rounded-full transition",
                      accent === a.value ? "ring-2 ring-offset-2 ring-offset-surface" : "hover:scale-110",
                    )}
                    style={{ background: a.value, ["--tw-ring-color"]: a.value } as React.CSSProperties}
                  />
                ))}
              </div>
            </section>
          )}

          {cat === "notifications" && (
            <section>
              <h2 className="mb-4 text-lg font-semibold">Notifications</h2>
              <Row label="Direct messages" desc="When someone mentions or DMs you"><Toggle defaultOn label="Direct messages" /></Row>
              <Row label="Task assignments" desc="When a task is assigned to you"><Toggle defaultOn label="Task assignments" /></Row>
              <Row label="Snippet comments"><Toggle label="Snippet comments" /></Row>
            </section>
          )}

          {cat === "project" && (
            activeWorkspace ? <ProjectPane ws={activeWorkspace} /> : <p className="text-sm text-muted">No active project.</p>
          )}
        </div>
      </div>
    </div>
  );
}
