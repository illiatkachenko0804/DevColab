import { api } from "./api";

export interface Activity {
  id: string;
  actorId: string;
  actorName: string;
  app: string;
  type: string;
  text: string;
  targetId?: string;
  createdAt: string;
}

export function listActivity(workspaceId: string): Promise<Activity[]> {
  return api(`/api/workspaces/${workspaceId}/activity`);
}
