import { useQuery } from "@tanstack/react-query";
import { api } from "./api";
import { useOS } from "@/stores/os";

export interface Workspace {
  id: string;
  name: string;
  slug?: string;
  description?: string | null;
  role: string;
  initial: string;
  accent: string;
  permissions: Record<string, boolean>;
}

interface WorkspaceDto {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  role: string;
  permissions: Record<string, boolean>;
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
    permissions: d.permissions,
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

export function usePermissions() {
  const ws = useOS((s) => s.activeWorkspace);
  const { data: workspaces } = useQuery({
    queryKey: ["workspaces"],
    queryFn: listMyWorkspaces,
    staleTime: 1000 * 60 * 5,
  });
  const current = workspaces?.find((w) => w.id === ws);
  return current?.permissions ?? {};
}
