import { ApiError, api } from "./api";

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

export interface ProjectFile {
  id: string;
  name: string;
  contentType: string | null;
  size: number;
  createdAt: string;
  isFolder: boolean;
  parentId: string | null;
  accessType: string;
  uploader: { id: string; displayName: string; devTag: string } | null;
}

export function listFiles(ws: string): Promise<ProjectFile[]> {
  return api(`/api/workspaces/${ws}/files`);
}

export async function uploadFile(
  ws: string, 
  file: File, 
  retry = true, 
  hidden = false,
  parentId?: string,
  accessType?: string,
  allowedUsers?: string[]
): Promise<ProjectFile> {
  const form = new FormData();
  form.append("file", file);
  if (hidden) form.append("hidden", "true");
  if (parentId) form.append("parentId", parentId);
  if (accessType) form.append("accessType", accessType);
  if (allowedUsers) {
    allowedUsers.forEach(u => form.append("allowedUsers", u));
  }
  
  const res = await fetch(`${BASE}/api/workspaces/${ws}/files`, {
    method: "POST",
    credentials: "include",
    body: form,
  });
  if (res.status === 401 && retry) {
    const r = await fetch(`${BASE}/api/auth/refresh`, { method: "POST", credentials: "include" });
    if (r.ok) return uploadFile(ws, file, false, hidden, parentId, accessType, allowedUsers);
  }
  if (!res.ok) throw new ApiError(res.status, "Upload failed");
  return res.json();
}

export function createFolder(ws: string, name: string, parentId?: string, accessType?: string, allowedUsers?: string[]): Promise<ProjectFile> {
  return api(`/api/workspaces/${ws}/folders`, {
    method: "POST",
    body: JSON.stringify({ name, parentId: parentId || null, accessType, allowedUsers })
  });
}

export function deleteFile(id: string): Promise<void> {
  return api(`/api/files/${id}`, { method: "DELETE" });
}

export function fileUrl(id: string, download = false): string {
  return `${BASE}/api/files/${id}${download ? "?download=true" : ""}`;
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
