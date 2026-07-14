import { api } from "./api";

export interface SnippetAuthor {
  id: string;
  displayName: string;
  devTag: string;
  avatarUrl: string | null;
}

export interface ForkedFrom {
  id: string;
  title: string;
}

export interface Snippet {
  id: string;
  title: string;
  language: string;
  code: string;
  description: string | null;
  collectionId: string | null;
  collectionName: string | null;
  forkedFrom: ForkedFrom | null;
  pinned: boolean;
  visibility: "WORKSPACE" | "PRIVATE";
  starred: boolean;
  starCount: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  commentCount: number;
  author: SnippetAuthor | null;
}

export interface SnippetComment {
  id: string;
  content: string;
  createdAt: string;
  editedAt?: string | null;
  author: SnippetAuthor | null;
}

export interface SnippetDetail {
  snippet: Snippet;
  comments: SnippetComment[];
}

export interface SnippetCollection {
  id: string;
  name: string;
  color: string;
  icon: string;
  snippetCount: number;
}

export interface SnippetTag {
  id: string;
  name: string;
  count: number;
}

export interface SnippetRevision {
  id: string;
  code: string;
  language: string;
  message: string | null;
  author: SnippetAuthor | null;
  createdAt: string;
}

// ---------------------------------------------------------
// Snippets
// ---------------------------------------------------------

export function listSnippets(
  ws: string,
  params?: {
    collectionId?: string;
    tag?: string;
    search?: string;
    starred?: boolean;
    mine?: boolean;
  }
): Promise<Snippet[]> {
  const query = new URLSearchParams();
  if (params) {
    if (params.collectionId) query.set("collectionId", params.collectionId);
    if (params.tag) query.set("tag", params.tag);
    if (params.search) query.set("search", params.search);
    if (params.starred) query.set("starred", "true");
    if (params.mine) query.set("mine", "true");
  }
  const q = query.toString();
  return api(`/api/workspaces/${ws}/snippets${q ? "?" + q : ""}`);
}

export function createSnippet(
  ws: string,
  body: {
    title: string;
    language: string;
    code: string;
    description?: string;
    collectionId?: string;
    tags?: string[];
    visibility?: string;
  }
): Promise<Snippet> {
  return api(`/api/workspaces/${ws}/snippets`, { method: "POST", body: JSON.stringify(body) });
}

export function updateSnippet(
  id: string,
  body: {
    title?: string;
    language?: string;
    code?: string;
    description?: string;
    collectionId?: string;
    tags?: string[];
    pinned?: boolean;
    visibility?: string;
  }
): Promise<Snippet> {
  return api(`/api/snippets/${id}`, { method: "PATCH", body: JSON.stringify(body) });
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

export function toggleStarSnippet(id: string): Promise<void> {
  return api(`/api/snippets/${id}/star`, { method: "POST" });
}

export function listSnippetRevisions(id: string): Promise<SnippetRevision[]> {
  return api(`/api/snippets/${id}/revisions`);
}

// ---------------------------------------------------------
// Collections
// ---------------------------------------------------------

export function listSnippetCollections(ws: string): Promise<SnippetCollection[]> {
  return api(`/api/workspaces/${ws}/snippet-collections`);
}

export function createSnippetCollection(
  ws: string,
  body: { name: string; color?: string; icon?: string }
): Promise<SnippetCollection> {
  return api(`/api/workspaces/${ws}/snippet-collections`, { method: "POST", body: JSON.stringify(body) });
}

export function updateSnippetCollection(
  id: string,
  ws: string,
  body: { name: string; color?: string; icon?: string; position?: number }
): Promise<SnippetCollection> {
  return api(`/api/snippet-collections/${id}?workspaceId=${ws}`, { method: "PUT", body: JSON.stringify(body) });
}

export function deleteSnippetCollection(id: string, ws: string): Promise<void> {
  return api(`/api/snippet-collections/${id}?workspaceId=${ws}`, { method: "DELETE" });
}

// ---------------------------------------------------------
// Tags
// ---------------------------------------------------------

export function listSnippetTags(ws: string): Promise<SnippetTag[]> {
  return api(`/api/workspaces/${ws}/snippet-tags`);
}

export function deleteSnippetTag(id: string, ws: string): Promise<void> {
  return api(`/api/snippet-tags/${id}?workspaceId=${ws}`, { method: "DELETE" });
}
