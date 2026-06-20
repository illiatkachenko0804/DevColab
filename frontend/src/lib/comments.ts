import { api } from "./api";
import type { TaskAssignee } from "./board";

export interface TaskComment {
  id: string;
  author: TaskAssignee | null;
  content: string;
  createdAt: string;
  editedAt: string | null;
}

export function getComments(taskId: string): Promise<TaskComment[]> {
  return api(`/api/tasks/${taskId}/comments`);
}

export function createComment(taskId: string, content: string): Promise<TaskComment> {
  return api(`/api/tasks/${taskId}/comments`, {
    method: "POST",
    body: JSON.stringify({ content }),
  });
}

export function updateComment(commentId: string, content: string): Promise<TaskComment> {
  return api(`/api/comments/${commentId}`, {
    method: "PUT",
    body: JSON.stringify({ content }),
  });
}

export function deleteComment(commentId: string): Promise<void> {
  return api(`/api/comments/${commentId}`, { method: "DELETE" });
}
