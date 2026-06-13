import { api } from "./api";

export interface TaskAssignee {
  id: string;
  displayName: string;
  devTag: string;
  avatarUrl: string | null;
}

export interface BoardTask {
  id: string;
  columnId: string;
  title: string;
  description: string | null;
  due: string | null;
  position: number;
  assignee: TaskAssignee | null;
}

export interface BoardColumn {
  id: string;
  name: string;
  position: number;
  tasks: BoardTask[];
}

export interface Board {
  id: string;
  name: string;
  columns: BoardColumn[];
}

export function getBoard(ws: string): Promise<Board> {
  return api(`/api/workspaces/${ws}/board`);
}

export function createTask(
  columnId: string,
  body: { title: string; description?: string; assigneeId?: string; due?: string },
): Promise<BoardTask> {
  return api(`/api/columns/${columnId}/tasks`, { method: "POST", body: JSON.stringify(body) });
}

export function updateTask(
  taskId: string,
  body: { title?: string; description?: string; assigneeId?: string; due?: string },
): Promise<BoardTask> {
  return api(`/api/tasks/${taskId}`, { method: "PATCH", body: JSON.stringify(body) });
}

export function moveTask(taskId: string, columnId: string, position: number): Promise<BoardTask> {
  return api(`/api/tasks/${taskId}/move`, { method: "POST", body: JSON.stringify({ columnId, position }) });
}

export function deleteTask(taskId: string): Promise<void> {
  return api(`/api/tasks/${taskId}`, { method: "DELETE" });
}
