import { api } from "./api";

export interface Workspace {
  id: string;
  name: string;
  slug?: string;
  description?: string | null;
  role: "ADMIN" | "MEMBER";
  initial: string;
  accent: string;
}

interface WorkspaceDto {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  role: "ADMIN" | "MEMBER";
}

const ACCENTS = ["#0a84ff", "#bf5af2", "#30d158", "#ff9f0a", "#ff375f", "#64d2ff", "#5e5ce6"];

export function workspaceAccent(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return ACCENTS[h % ACCENTS.length];
}

export function workspaceInitial(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function toWorkspace(d: WorkspaceDto): Workspace {
  return {
    id: d.id,
    name: d.name,
    slug: d.slug,
    description: d.description,
    role: d.role,
    initial: workspaceInitial(d.name),
    accent: workspaceAccent(d.id),
  };
}

export async function listMyWorkspaces(): Promise<Workspace[]> {
  const data = await api<WorkspaceDto[]>("/api/workspaces");
  return data.map(toWorkspace);
}

export async function createWorkspace(name: string, description?: string): Promise<Workspace> {
  const data = await api<WorkspaceDto>("/api/workspaces", {
    method: "POST",
    body: JSON.stringify({ name, description: description ?? null }),
  });
  return toWorkspace(data);
}
