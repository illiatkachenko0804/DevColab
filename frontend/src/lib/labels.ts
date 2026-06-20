import { api } from "./api";

export interface Label {
  id: string;
  name: string;
  color: string;
}

export function getLabels(workspaceId: string): Promise<Label[]> {
  return api(`/api/workspaces/${workspaceId}/labels`);
}

export function createLabel(workspaceId: string, name: string, color: string): Promise<Label> {
  return api(`/api/workspaces/${workspaceId}/labels`, {
    method: "POST",
    body: JSON.stringify({ name, color }),
  });
}

export function updateLabel(labelId: string, name: string, color: string): Promise<Label> {
  return api(`/api/labels/${labelId}`, {
    method: "PUT",
    body: JSON.stringify({ name, color }),
  });
}

export function deleteLabel(labelId: string): Promise<void> {
  return api(`/api/labels/${labelId}`, { method: "DELETE" });
}

export function attachLabelToTask(taskId: string, labelId: string): Promise<void> {
  return api(`/api/tasks/${taskId}/labels/${labelId}`, { method: "POST" });
}

export function detachLabelFromTask(taskId: string, labelId: string): Promise<void> {
  return api(`/api/tasks/${taskId}/labels/${labelId}`, { method: "DELETE" });
}
