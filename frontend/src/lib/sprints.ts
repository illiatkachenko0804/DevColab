import { api } from "./api";

export interface Sprint {
  id: string;
  name: string;
  goal: string | null;
  status: "DRAFT" | "ACTIVE" | "COMPLETED";
  startDate: string | null;
  endDate: string | null;
  taskCount: number;
  completedCount: number;
  totalPoints: number;
  completedPoints: number;
}

export function getSprints(workspaceId: string): Promise<Sprint[]> {
  return api(`/api/workspaces/${workspaceId}/sprints`);
}

export function createSprint(workspaceId: string, payload: Partial<Sprint>): Promise<Sprint> {
  return api(`/api/workspaces/${workspaceId}/sprints`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateSprint(sprintId: string, payload: Partial<Sprint>): Promise<Sprint> {
  return api(`/api/sprints/${sprintId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteSprint(sprintId: string): Promise<void> {
  return api(`/api/sprints/${sprintId}`, { method: "DELETE" });
}

export function startSprint(sprintId: string): Promise<Sprint> {
  return api(`/api/sprints/${sprintId}/start`, { method: "POST" });
}

export function completeSprint(sprintId: string): Promise<Sprint> {
  return api(`/api/sprints/${sprintId}/complete`, { method: "POST" });
}
