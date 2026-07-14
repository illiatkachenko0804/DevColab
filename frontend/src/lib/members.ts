import { api } from "./api";

export interface Member {
  id: string;
  displayName: string;
  devTag: string;
  email: string;
  avatarUrl: string | null;
  role: string;
}

export function listMembers(ws: string): Promise<Member[]> {
  return api(`/api/workspaces/${ws}/members`);
}

export function searchMembers(ws: string, q: string): Promise<Member[]> {
  return api(`/api/workspaces/${ws}/members/search?q=${encodeURIComponent(q)}`);
}

export function inviteMember(ws: string, query: string): Promise<Member> {
  return api(`/api/workspaces/${ws}/members`, {
    method: "POST",
    body: JSON.stringify({ query }),
  });
}

export function removeMember(ws: string, userId: string): Promise<void> {
  return api(`/api/workspaces/${ws}/members/${userId}`, { method: "DELETE" });
}

export function updateMemberRole(ws: string, userId: string, role: string): Promise<void> {
  return api(`/api/workspaces/${ws}/members/${userId}/role`, {
    method: "PATCH",
    body: JSON.stringify({ role }),
  });
}
