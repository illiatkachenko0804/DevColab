/**
 * Static mock data for the UI-only build. No network, no backend.
 * Timestamps are relative to load so "relative time" stays believable.
 */

const ago = (mins: number) => new Date(Date.now() - mins * 60_000).toISOString();

export type Presence = "online" | "away" | "offline";

export interface User {
  id: string;
  name: string;
  handle: string;
  role: "Admin" | "Member";
  presence: Presence;
  title: string;
}

export const currentUser: User = {
  id: "u1",
  name: "Illia Tkachenko",
  handle: "illia",
  role: "Admin",
  presence: "online",
  title: "Founder",
};

export const users: User[] = [
  currentUser,
  { id: "u2", name: "Maria Kovac", handle: "maria", role: "Member", presence: "online", title: "Frontend Engineer" },
  { id: "u3", name: "Dan Whitfield", handle: "dan", role: "Member", presence: "online", title: "Backend Engineer" },
  { id: "u4", name: "Sofia Rossi", handle: "sofia", role: "Member", presence: "away", title: "Product Designer" },
  { id: "u5", name: "Kenji Watanabe", handle: "kenji", role: "Member", presence: "offline", title: "DevOps" },
  { id: "u6", name: "Aisha Bello", handle: "aisha", role: "Member", presence: "offline", title: "QA Engineer" },
];

export const userById = (id: string) => users.find((u) => u.id === id)!;

export interface Workspace {
  id: string;
  name: string;
  initial: string;
  accent: string;
}

export const workspaces: Workspace[] = [
  { id: "w1", name: "DevCollab Core", initial: "DC", accent: "var(--app-chat)" },
  { id: "w2", name: "Orbit Mobile", initial: "OM", accent: "var(--app-snippets)" },
  { id: "w3", name: "Atlas API", initial: "AA", accent: "var(--app-activity)" },
];

export interface Channel {
  id: string;
  name: string;
  unread: number;
}

export const channels: Channel[] = [
  { id: "c1", name: "general", unread: 0 },
  { id: "c2", name: "frontend", unread: 3 },
  { id: "c3", name: "backend", unread: 0 },
  { id: "c4", name: "design", unread: 1 },
  { id: "c5", name: "random", unread: 0 },
];

export interface Message {
  id: string;
  channelId: string;
  userId: string;
  body: string;
  at: string;
  code?: { lang: string; content: string };
}

export const messages: Message[] = [
  { id: "m1", channelId: "c2", userId: "u2", body: "Pushed the macOS window frame — traffic lights animate on hover now ✨", at: ago(54) },
  { id: "m2", channelId: "c2", userId: "u4", body: "Love it. Can we nudge the dock magnification a touch softer?", at: ago(48) },
  { id: "m3", channelId: "c2", userId: "u3", body: "Here's the helper I used for the spring config:", at: ago(40),
    code: { lang: "ts", content: "const spring = {\n  type: \"spring\",\n  stiffness: 320,\n  damping: 28,\n} as const;" } },
  { id: "m4", channelId: "c2", userId: "u2", body: "Perfect, dropping that into the Dock component.", at: ago(33) },
  { id: "m5", channelId: "c2", userId: "u4", body: "Also the command palette ⌘K feels great. Very Spotlight.", at: ago(12) },
  { id: "m6", channelId: "c2", userId: "u3", body: "Shipping the snippet syntax highlighting next.", at: ago(4) },
];

export const messagesByChannel = (channelId: string) =>
  messages.filter((m) => m.channelId === channelId);

export interface Task {
  id: string;
  title: string;
  description?: string;
  assigneeId?: string;
  due?: string; // e.g. "Jun 14"
  labels: { text: string; color: string }[];
}

export interface Column {
  id: string;
  name: string;
  taskIds: string[];
}

export const tasks: Record<string, Task> = {
  t1: { id: "t1", title: "Design the Dock magnification curve", assigneeId: "u4", due: "Jun 11", labels: [{ text: "design", color: "var(--app-snippets)" }] },
  t2: { id: "t2", title: "WindowFrame traffic-light controls", assigneeId: "u2", due: "Jun 10", labels: [{ text: "ui", color: "var(--app-chat)" }] },
  t3: { id: "t3", title: "Command palette fuzzy search", assigneeId: "u3", labels: [{ text: "feature", color: "var(--app-activity)" }] },
  t4: { id: "t4", title: "Wire STOMP presence indicators", assigneeId: "u3", due: "Jun 16", labels: [{ text: "realtime", color: "var(--app-members)" }] },
  t5: { id: "t5", title: "Snippet syntax highlighting (Shiki)", assigneeId: "u2", labels: [{ text: "feature", color: "var(--app-activity)" }] },
  t6: { id: "t6", title: "Notification Center panel", assigneeId: "u4", due: "Jun 18", labels: [{ text: "ui", color: "var(--app-chat)" }] },
  t7: { id: "t7", title: "Kanban drag-and-drop with dnd-kit", assigneeId: "u2", labels: [{ text: "feature", color: "var(--app-activity)" }] },
  t8: { id: "t8", title: "Settings: appearance & accent picker", assigneeId: "u4", due: "Jun 20", labels: [{ text: "design", color: "var(--app-snippets)" }] },
  t9: { id: "t9", title: "Mobile bottom-tab shell", assigneeId: "u2", labels: [{ text: "responsive", color: "var(--app-projects)" }] },
};

export const initialColumns: Column[] = [
  { id: "todo", name: "Todo", taskIds: ["t3", "t4", "t8", "t9"] },
  { id: "doing", name: "In Progress", taskIds: ["t1", "t5", "t7"] },
  { id: "done", name: "Done", taskIds: ["t2", "t6"] },
];

export interface Snippet {
  id: string;
  title: string;
  lang: string;
  code: string;
  authorId: string;
  at: string;
  comments: number;
}

export const snippets: Snippet[] = [
  {
    id: "s1",
    title: "Spring physics preset",
    lang: "ts",
    authorId: "u3",
    at: ago(120),
    comments: 4,
    code: `export const macSpring = {
  type: "spring",
  stiffness: 320,
  damping: 28,
  mass: 0.9,
} as const;`,
  },
  {
    id: "s2",
    title: "Vibrancy material (Tailwind v4)",
    lang: "css",
    authorId: "u2",
    at: ago(220),
    comments: 2,
    code: `@utility glass {
  background-color: var(--glass);
  backdrop-filter: blur(22px) saturate(180%);
  -webkit-backdrop-filter: blur(22px) saturate(180%);
}`,
  },
  {
    id: "s3",
    title: "Presence dot",
    lang: "tsx",
    authorId: "u4",
    at: ago(360),
    comments: 1,
    code: `function PresenceDot({ state }: { state: "online" | "away" | "offline" }) {
  const color = { online: "#30D158", away: "#FF9F0A", offline: "#8E8E93" }[state];
  return <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />;
}`,
  },
  {
    id: "s4",
    title: "Fractional reorder index",
    lang: "ts",
    authorId: "u3",
    at: ago(600),
    comments: 6,
    code: `function between(a = 0, b = a + 2000) {
  return (a + b) / 2; // keep positions as floats to avoid re-indexing
}`,
  },
];

export type ActivityType = "task" | "join" | "snippet" | "message" | "board";

export interface Activity {
  id: string;
  type: ActivityType;
  actorId: string;
  text: string;
  at: string;
}

export const activities: Activity[] = [
  { id: "a1", type: "task", actorId: "u2", text: "moved “WindowFrame traffic-light controls” to Done", at: ago(8) },
  { id: "a2", type: "snippet", actorId: "u3", text: "shared a snippet “Fractional reorder index”", at: ago(26) },
  { id: "a3", type: "join", actorId: "u6", text: "joined the workspace", at: ago(64) },
  { id: "a4", type: "message", actorId: "u4", text: "posted in #design", at: ago(95) },
  { id: "a5", type: "board", actorId: "u2", text: "created board “Q3 Roadmap”", at: ago(140) },
  { id: "a6", type: "task", actorId: "u3", text: "assigned “Wire STOMP presence indicators” to themselves", at: ago(210) },
  { id: "a7", type: "join", actorId: "u5", text: "joined the workspace", at: ago(320) },
];

export interface Notification {
  id: string;
  app: "chat" | "projects" | "members" | "snippets";
  title: string;
  body: string;
  at: string;
  read: boolean;
}

export const notifications: Notification[] = [
  { id: "n1", app: "chat", title: "Maria Kovac", body: "mentioned you in #frontend", at: ago(6), read: false },
  { id: "n2", app: "projects", title: "Task assigned", body: "“Mobile bottom-tab shell” is now yours", at: ago(22), read: false },
  { id: "n3", app: "members", title: "Aisha Bello", body: "joined DevCollab Core", at: ago(64), read: false },
  { id: "n4", app: "snippets", title: "New comment", body: "Dan commented on “Fractional reorder index”", at: ago(180), read: true },
];
