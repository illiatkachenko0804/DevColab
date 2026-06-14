import { api } from "./api";

export interface SnippetAuthor {
  id: string;
  displayName: string;
  devTag: string;
  avatarUrl: string | null;
}

export interface Snippet {
  id: string;
  title: string;
  language: string;
  code: string;
  createdAt: string;
  commentCount: number;
  author: SnippetAuthor | null;
}

export interface SnippetComment {
  id: string;
  content: string;
  createdAt: string;
  author: SnippetAuthor | null;
}

export interface SnippetDetail {
  snippet: Snippet;
  comments: SnippetComment[];
}

export function listSnippets(ws: string): Promise<Snippet[]> {
  return api(`/api/workspaces/${ws}/snippets`);
}

export function createSnippet(
  ws: string,
  body: { title: string; language: string; code: string },
): Promise<Snippet> {
  return api(`/api/workspaces/${ws}/snippets`, { method: "POST", body: JSON.stringify(body) });
}

export function getSnippet(id: string): Promise<SnippetDetail> {
  return api(`/api/snippets/${id}`);
}

export function deleteSnippet(id: string): Promise<void> {
  return api(`/api/snippets/${id}`, { method: "DELETE" });
}

export function addSnippetComment(id: string, content: string): Promise<SnippetComment> {
  return api(`/api/snippets/${id}/comments`, { method: "POST", body: JSON.stringify({ content }) });
}
