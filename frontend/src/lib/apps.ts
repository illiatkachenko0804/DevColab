import {
  Activity,
  Code2,
  LayoutGrid,
  MessageSquare,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";

export type AppId =
  | "chat"
  | "projects"
  | "snippets"
  | "activity"
  | "members"
  | "settings";

export interface AppMeta {
  id: AppId;
  label: string;
  icon: LucideIcon;
  accent: string; // CSS var for the per-app accent
}

export const APPS: AppMeta[] = [
  { id: "chat", label: "Chat", icon: MessageSquare, accent: "var(--app-chat)" },
  { id: "projects", label: "Projects", icon: LayoutGrid, accent: "var(--app-projects)" },
  { id: "snippets", label: "Snippets", icon: Code2, accent: "var(--app-snippets)" },
  { id: "activity", label: "Activity", icon: Activity, accent: "var(--app-activity)" },
  { id: "members", label: "Members", icon: Users, accent: "var(--app-members)" },
  { id: "settings", label: "Settings", icon: Settings, accent: "var(--app-settings)" },
];

export const appMeta = (id: AppId): AppMeta => APPS.find((a) => a.id === id)!;
