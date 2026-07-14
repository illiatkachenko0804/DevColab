import { api } from "./api";

export type PermissionKey =
  | "viewApps"
  | "answerChannels"
  | "comment"
  | "manageProject"
  | "manageRoles"
  | "inviteMembers"
  | "removeMembers"
  | "manageTasks"
  | "manageSprints"
  | "manageSnippets"
  | "manageFiles"
  | "exportData";

export interface ProjectRole {
  id: string;
  name: string;
  description: string | null;
  systemKey: string | null;
  permissions: Record<PermissionKey, boolean>;
}

export interface ProjectSettings {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  avatarUrl: string | null;
  color: string | null;
  taskKeyPrefix: string | null;
  defaultTaskType: "TASK" | "BUG" | "STORY" | "EPIC";
  defaultTaskPriority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  defaultSprintDays: number;
  invitePolicy: "ADMINS" | "MAINTAINERS";
  defaultRole: string;
  archived: boolean;
  roles: ProjectRole[];
}

export type UpdateProjectSettings = Partial<
  Pick<
    ProjectSettings,
    | "name"
    | "slug"
    | "description"
    | "avatarUrl"
    | "color"
    | "taskKeyPrefix"
    | "defaultTaskType"
    | "defaultTaskPriority"
    | "defaultSprintDays"
    | "invitePolicy"
    | "defaultRole"
  >
>;

export const PERMISSION_LABELS: Record<PermissionKey, string> = {
  viewApps: "View apps",
  answerChannels: "Answer in channels and chats",
  comment: "Comment on tasks and snippets",
  manageProject: "Edit project settings",
  manageRoles: "Manage roles",
  inviteMembers: "Invite members",
  removeMembers: "Remove members",
  manageTasks: "Create and edit tasks",

  manageSprints: "Manage sprints",
  manageSnippets: "Manage snippets",
  manageFiles: "Upload and delete files",
  exportData: "Export data",
};

export const PERMISSION_KEYS = Object.keys(PERMISSION_LABELS) as PermissionKey[];

export function viewerPermissions(): Record<PermissionKey, boolean> {
  return Object.fromEntries(PERMISSION_KEYS.map((k) => [k, k === "viewApps" || k === "answerChannels"])) as Record<PermissionKey, boolean>;
}

export function getProjectSettings(ws: string): Promise<ProjectSettings> {
  return api(`/api/workspaces/${ws}/settings`);
}

export function updateProjectSettings(ws: string, body: UpdateProjectSettings): Promise<ProjectSettings> {
  return api(`/api/workspaces/${ws}/settings`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function createProjectRole(
  ws: string,
  body: { name: string; description?: string; permissions: Record<PermissionKey, boolean> },
): Promise<ProjectRole> {
  return api(`/api/workspaces/${ws}/roles`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateProjectRole(
  ws: string,
  roleId: string,
  body: { name?: string; description?: string; permissions?: Record<PermissionKey, boolean> },
): Promise<ProjectRole> {
  return api(`/api/workspaces/${ws}/roles/${roleId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function exportProjectData(ws: string): Promise<ProjectSettings> {
  return api(`/api/workspaces/${ws}/export`);
}

export function archiveProject(ws: string): Promise<ProjectSettings> {
  return api(`/api/workspaces/${ws}/archive`, { method: "POST" });
}

export function deleteProject(ws: string): Promise<void> {
  return api(`/api/workspaces/${ws}`, { method: "DELETE" });
}
