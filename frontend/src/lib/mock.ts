/**
 * Static mock data for the UI-only build. No network, no backend.
 * Everything is scoped per-workspace so the global project switcher changes
 * channels, board, members, snippets, activity and notifications together.
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
  { id: "w1", name: "DevCollab Core", initial: "DC", accent: "#0a84ff" },
  { id: "w2", name: "Orbit Mobile", initial: "OM", accent: "#bf5af2" },
  { id: "w3", name: "Atlas API", initial: "AA", accent: "#30d158" },
];

export const workspaceById = (id: string) => workspaces.find((w) => w.id === id)!;

export interface Channel {
  id: string;
  name: string;
  unread: number;
}

export interface Message {
  id: string;
  channelId: string;
  userId: string;
  body: string;
  at: string;
  code?: { lang: string; content: string };
}

export interface Task {
  id: string;
  title: string;
  assigneeId?: string;
  due?: string;
  labels: { text: string; color: string }[];
}

export interface Column {
  id: string;
  name: string;
  taskIds: string[];
}

export interface Board {
  name: string;
  columns: Column[];
  tasks: Record<string, Task>;
}

export interface Snippet {
  id: string;
  title: string;
  lang: string;
  code: string;
  authorId: string;
  at: string;
  comments: number;
}

export type ActivityType = "task" | "join" | "snippet" | "message" | "board";

export interface Activity {
  id: string;
  type: ActivityType;
  actorId: string;
  text: string;
  at: string;
}

export interface Notification {
  id: string;
  app: "chat" | "projects" | "members" | "snippets";
  title: string;
  body: string;
  at: string;
  read: boolean;
}

export interface WorkspaceData {
  memberIds: string[];
  channels: Channel[];
  messages: Record<string, Message[]>;
  board: Board;
  snippets: Snippet[];
  activities: Activity[];
  notifications: Notification[];
}

const L = {
  feature: { text: "feature", color: "var(--app-activity)" },
  ui: { text: "ui", color: "var(--app-chat)" },
  design: { text: "design", color: "var(--app-snippets)" },
  realtime: { text: "realtime", color: "var(--app-members)" },
  bug: { text: "bug", color: "var(--danger)" },
  infra: { text: "infra", color: "var(--app-projects)" },
};

export const WORKSPACE_DATA: Record<string, WorkspaceData> = {
  // ---------------------------------------------------------------- DevCollab
  w1: {
    memberIds: ["u1", "u2", "u3", "u4", "u5", "u6"],
    channels: [
      { id: "w1-general", name: "general", unread: 0 },
      { id: "w1-frontend", name: "frontend", unread: 3 },
      { id: "w1-backend", name: "backend", unread: 0 },
      { id: "w1-design", name: "design", unread: 1 },
      { id: "w1-random", name: "random", unread: 0 },
    ],
    messages: {
      "w1-frontend": [
        { id: "m1", channelId: "w1-frontend", userId: "u2", body: "Pushed the macOS window frame — traffic lights animate on hover now.", at: ago(54) },
        { id: "m2", channelId: "w1-frontend", userId: "u4", body: "Love it. Can we nudge the dock magnification a touch softer?", at: ago(48) },
        { id: "m3", channelId: "w1-frontend", userId: "u3", body: "Here's the spring config I used:", at: ago(40), code: { lang: "ts", content: "const spring = {\n  type: \"spring\",\n  stiffness: 320,\n  damping: 28,\n} as const;" } },
        { id: "m4", channelId: "w1-frontend", userId: "u2", body: "Perfect, dropping that into the Dock component.", at: ago(33) },
        { id: "m5", channelId: "w1-frontend", userId: "u4", body: "Also the command palette feels great. Very Spotlight.", at: ago(12) },
        { id: "m6", channelId: "w1-frontend", userId: "u3", body: "Shipping snippet syntax highlighting next.", at: ago(4) },
      ],
      "w1-general": [
        { id: "m7", channelId: "w1-general", userId: "u1", body: "Welcome to DevCollab Core. Standup at 10:00.", at: ago(180) },
        { id: "m8", channelId: "w1-general", userId: "u6", body: "Thanks! Excited to be here.", at: ago(70) },
      ],
      "w1-design": [
        { id: "m9", channelId: "w1-design", userId: "u4", body: "New accent palette in the Appearance settings — try the purple.", at: ago(26) },
      ],
    },
    board: {
      name: "Q3 Roadmap",
      columns: [
        { id: "w1-todo", name: "Todo", taskIds: ["t3", "t4", "t8", "t9"] },
        { id: "w1-doing", name: "In Progress", taskIds: ["t1", "t5", "t7"] },
        { id: "w1-done", name: "Done", taskIds: ["t2", "t6"] },
      ],
      tasks: {
        t1: { id: "t1", title: "Design the Dock magnification curve", assigneeId: "u4", due: "Jun 11", labels: [L.design] },
        t2: { id: "t2", title: "WindowFrame traffic-light controls", assigneeId: "u2", due: "Jun 10", labels: [L.ui] },
        t3: { id: "t3", title: "Command palette fuzzy search", assigneeId: "u3", labels: [L.feature] },
        t4: { id: "t4", title: "Wire STOMP presence indicators", assigneeId: "u3", due: "Jun 16", labels: [L.realtime] },
        t5: { id: "t5", title: "Snippet syntax highlighting (Shiki)", assigneeId: "u2", labels: [L.feature] },
        t6: { id: "t6", title: "Notification Center panel", assigneeId: "u4", due: "Jun 18", labels: [L.ui] },
        t7: { id: "t7", title: "Kanban drag-and-drop with dnd-kit", assigneeId: "u2", labels: [L.feature] },
        t8: { id: "t8", title: "Settings: appearance & accent picker", assigneeId: "u4", due: "Jun 20", labels: [L.design] },
        t9: { id: "t9", title: "Multiple draggable windows", assigneeId: "u2", labels: [L.feature] },
      },
    },
    snippets: [
      { id: "s1", title: "Spring physics preset", lang: "ts", authorId: "u3", at: ago(120), comments: 4, code: `export const macSpring = {\n  type: "spring",\n  stiffness: 320,\n  damping: 28,\n  mass: 0.9,\n} as const;` },
      { id: "s2", title: "Vibrancy material (Tailwind v4)", lang: "css", authorId: "u2", at: ago(220), comments: 2, code: `@utility glass {\n  background-color: var(--glass);\n  backdrop-filter: blur(22px) saturate(180%);\n}` },
      { id: "s3", title: "Presence dot", lang: "tsx", authorId: "u4", at: ago(360), comments: 1, code: `function PresenceDot({ state }: { state: "online" | "away" | "offline" }) {\n  const color = { online: "#30D158", away: "#FF9F0A", offline: "#8E8E93" }[state];\n  return <span style={{ background: color }} />;\n}` },
    ],
    activities: [
      { id: "a1", type: "task", actorId: "u2", text: "moved “WindowFrame traffic-light controls” to Done", at: ago(8) },
      { id: "a2", type: "snippet", actorId: "u3", text: "shared a snippet “Spring physics preset”", at: ago(26) },
      { id: "a3", type: "join", actorId: "u6", text: "joined the workspace", at: ago(64) },
      { id: "a4", type: "message", actorId: "u4", text: "posted in #design", at: ago(95) },
      { id: "a5", type: "board", actorId: "u2", text: "created board “Q3 Roadmap”", at: ago(140) },
    ],
    notifications: [
      { id: "n1", app: "chat", title: "Maria Kovac", body: "mentioned you in #frontend", at: ago(6), read: false },
      { id: "n2", app: "projects", title: "Task assigned", body: "“Multiple draggable windows” is now yours", at: ago(22), read: false },
      { id: "n3", app: "members", title: "Aisha Bello", body: "joined DevCollab Core", at: ago(64), read: false },
    ],
  },

  // -------------------------------------------------------------- Orbit Mobile
  w2: {
    memberIds: ["u1", "u2", "u4", "u5"],
    channels: [
      { id: "w2-general", name: "general", unread: 2 },
      { id: "w2-ios", name: "ios", unread: 0 },
      { id: "w2-android", name: "android", unread: 5 },
    ],
    messages: {
      "w2-general": [
        { id: "om1", channelId: "w2-general", userId: "u5", body: "TestFlight build 42 is up for review.", at: ago(88) },
        { id: "om2", channelId: "w2-general", userId: "u4", body: "Updated the onboarding illustrations.", at: ago(30) },
      ],
      "w2-android": [
        { id: "om3", channelId: "w2-android", userId: "u2", body: "Compose migration is 80% done.", at: ago(15) },
      ],
    },
    board: {
      name: "Mobile v2",
      columns: [
        { id: "w2-todo", name: "Todo", taskIds: ["om-t1", "om-t2"] },
        { id: "w2-doing", name: "In Progress", taskIds: ["om-t3"] },
        { id: "w2-done", name: "Done", taskIds: ["om-t4"] },
      ],
      tasks: {
        "om-t1": { id: "om-t1", title: "Push notification permissions flow", assigneeId: "u5", due: "Jun 14", labels: [L.feature] },
        "om-t2": { id: "om-t2", title: "Dark mode for onboarding", assigneeId: "u4", labels: [L.design] },
        "om-t3": { id: "om-t3", title: "Jetpack Compose migration", assigneeId: "u2", due: "Jun 19", labels: [L.feature] },
        "om-t4": { id: "om-t4", title: "Fix iOS 18 safe-area insets", assigneeId: "u2", labels: [L.bug] },
      },
    },
    snippets: [
      { id: "om-s1", title: "SwiftUI safe-area modifier", lang: "ts", authorId: "u2", at: ago(140), comments: 0, code: `// pseudo-Swift\nview.ignoresSafeArea(.keyboard, edges: .bottom)` },
    ],
    activities: [
      { id: "oa1", type: "task", actorId: "u2", text: "moved “Fix iOS 18 safe-area insets” to Done", at: ago(18) },
      { id: "oa2", type: "message", actorId: "u5", text: "posted in #general", at: ago(88) },
    ],
    notifications: [
      { id: "on1", app: "projects", title: "Build ready", body: "TestFlight build 42 needs review", at: ago(40), read: false },
      { id: "on2", app: "chat", title: "Kenji Watanabe", body: "posted in #general", at: ago(88), read: true },
    ],
  },

  // ---------------------------------------------------------------- Atlas API
  w3: {
    memberIds: ["u1", "u3", "u5", "u6"],
    channels: [
      { id: "w3-general", name: "general", unread: 0 },
      { id: "w3-api", name: "api", unread: 1 },
      { id: "w3-infra", name: "infra", unread: 0 },
    ],
    messages: {
      "w3-api": [
        { id: "aa1", channelId: "w3-api", userId: "u3", body: "Rolled out cursor pagination on /messages.", at: ago(52) },
        { id: "aa2", channelId: "w3-api", userId: "u6", body: "Added contract tests for it.", at: ago(20) },
      ],
      "w3-infra": [
        { id: "aa3", channelId: "w3-infra", userId: "u5", body: "Redis cluster upgraded to 7.4.", at: ago(120) },
      ],
    },
    board: {
      name: "Platform",
      columns: [
        { id: "w3-todo", name: "Todo", taskIds: ["aa-t1", "aa-t2"] },
        { id: "w3-doing", name: "In Progress", taskIds: ["aa-t3"] },
        { id: "w3-done", name: "Done", taskIds: ["aa-t4"] },
      ],
      tasks: {
        "aa-t1": { id: "aa-t1", title: "Rate limiting with Bucket4j", assigneeId: "u3", due: "Jun 21", labels: [L.feature] },
        "aa-t2": { id: "aa-t2", title: "Postgres full-text search", assigneeId: "u3", labels: [L.feature] },
        "aa-t3": { id: "aa-t3", title: "WebSocket horizontal scaling", assigneeId: "u5", due: "Jun 24", labels: [L.infra] },
        "aa-t4": { id: "aa-t4", title: "JWT refresh-token rotation", assigneeId: "u3", labels: [L.feature] },
      },
    },
    snippets: [
      { id: "aa-s1", title: "Fractional reorder index", lang: "ts", authorId: "u3", at: ago(300), comments: 6, code: `function between(a = 0, b = a + 2000) {\n  return (a + b) / 2; // floats avoid re-indexing\n}` },
    ],
    activities: [
      { id: "aav1", type: "snippet", actorId: "u3", text: "shared a snippet “Fractional reorder index”", at: ago(40) },
      { id: "aav2", type: "join", actorId: "u6", text: "joined the workspace", at: ago(220) },
    ],
    notifications: [
      { id: "an1", app: "snippets", title: "New comment", body: "Aisha commented on “Fractional reorder index”", at: ago(30), read: false },
    ],
  },
};

// --- Selectors --------------------------------------------------------------
/** A brand-new (real) workspace has no demo content — return safe empties. */
function emptyData(ws: string): WorkspaceData {
  return {
    memberIds: [],
    channels: [],
    messages: {},
    board: {
      name: "Board",
      columns: [
        { id: `${ws}-todo`, name: "Todo", taskIds: [] },
        { id: `${ws}-doing`, name: "In Progress", taskIds: [] },
        { id: `${ws}-done`, name: "Done", taskIds: [] },
      ],
      tasks: {},
    },
    snippets: [],
    activities: [],
    notifications: [],
  };
}

export const wsData = (ws: string): WorkspaceData => WORKSPACE_DATA[ws] ?? emptyData(ws);
export const wsMembers = (ws: string): User[] => wsData(ws).memberIds.map(userById);
export const wsChannels = (ws: string): Channel[] => wsData(ws).channels;
export const wsMessages = (ws: string, channelId: string): Message[] =>
  wsData(ws).messages[channelId] ?? [];
export const wsBoard = (ws: string): Board => wsData(ws).board;
export const wsSnippets = (ws: string): Snippet[] => wsData(ws).snippets;
export const wsActivities = (ws: string): Activity[] => wsData(ws).activities;
export const wsNotifications = (ws: string): Notification[] => wsData(ws).notifications;

export function relativeLabel() {
  return null;
}
