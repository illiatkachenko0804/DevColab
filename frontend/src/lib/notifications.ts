import { api } from "./api";

export interface NotificationItem {
  id: string;
  app: "chat" | "projects" | "members" | "snippets" | null;
  type: string;
  title: string;
  body: string | null;
  channelId: string | null;
  createdAt: string;
  read: boolean;
}

export interface NotificationCounts {
  total: number;
  chat: number;
  projects: number;
  members: number;
  snippets: number;
}

export interface NotificationsData {
  items: NotificationItem[];
  counts: NotificationCounts;
}

export function listNotifications(ws: string): Promise<NotificationsData> {
  return api(`/api/workspaces/${ws}/notifications`);
}

export function markAllNotificationsRead(ws: string): Promise<void> {
  return api(`/api/workspaces/${ws}/notifications/read-all`, { method: "POST" });
}

export function markNotificationRead(id: string): Promise<void> {
  return api(`/api/notifications/${id}/read`, { method: "POST" });
}
