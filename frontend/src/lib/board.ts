import { api } from "./api";
import type { Label } from "./labels";

export interface TaskAssignee {
  id: string;
  displayName: string;
  devTag: string;
  avatarUrl: string | null;
}

export interface BoardTask {
  id: string;
  columnId: string;
  taskKey: string;
  type: "TASK" | "BUG" | "STORY" | "EPIC";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  storyPoints: number | null;
  title: string;
  description: string | null;
  due: string | null;
  position: number;
  sprintId: string | null;
  parentId: string | null;
  assignee: TaskAssignee | null;
  reporter: TaskAssignee | null;
  labels: Label[];
  commentCount: number;
  subtaskCount: number;
  subtasksDone: number;
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
  body: {
    title: string;
    description?: string;
    type?: string;
    priority?: string;
    storyPoints?: number;
    sprintId?: string;
    parentId?: string;
    assigneeId?: string;
    due?: string;
    labelIds?: string[];
  },
): Promise<BoardTask> {
  return api(`/api/columns/${columnId}/tasks`, { method: "POST", body: JSON.stringify(body) });
}

export function updateTask(
  taskId: string,
  body: {
    title?: string;
    description?: string;
    type?: string;
    priority?: string;
    storyPoints?: number;
    sprintId?: string;
    parentId?: string;
    assigneeId?: string;
    due?: string;
    labelIds?: string[];
  },
): Promise<BoardTask> {
  return api(`/api/tasks/${taskId}`, { method: "PATCH", body: JSON.stringify(body) });
}

export function moveTask(taskId: string, columnId: string, position: number): Promise<BoardTask> {
  return api(`/api/tasks/${taskId}/move`, { method: "POST", body: JSON.stringify({ columnId, position }) });
}

export function deleteTask(taskId: string): Promise<void> {
  return api(`/api/tasks/${taskId}`, { method: "DELETE" });
}

export interface Sprint {
  id: string;
  name: string;
  goal: string | null;
  status: "PLANNING" | "ACTIVE" | "COMPLETED";
  startDate: string | null;
  endDate: string | null;
  tasksCompleted: number;
  tasksTotal: number;
  pointsCompleted: number;
  pointsTotal: number;
}

export function getSprints(ws: string): Promise<Sprint[]> {
  return api(`/api/workspaces/${ws}/sprints`);
}
