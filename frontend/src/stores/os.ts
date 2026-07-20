import { create } from "zustand";
import type { AppId } from "@/lib/apps";
import type { AuthUser } from "@/lib/auth";
import type { Workspace } from "@/lib/workspaces";

const WS_KEY = "devcollab.workspace";

export interface WinState {
  app: AppId;
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
  minimized: boolean;
  maximized: boolean;
}

export const DEFAULT_SIZE: Record<AppId, { w: number; h: number }> = {
  chat: { w: 880, h: 600 },
  projects: { w: 920, h: 600 },
  snippets: { w: 840, h: 560 },
  members: { w: 760, h: 540 },
  files: { w: 820, h: 600 },
  settings: { w: 720, h: 520 },
};

export const MIN_W = 380;
export const MIN_H = 320;

interface OSState {
  loggedIn: boolean;
  user: AuthUser | null;
  workspaces: Workspace[];
  workspacesLoaded: boolean;
  activeWorkspace: string;
  windows: WinState[];
  zTop: number;
  commandOpen: boolean;
  notifOpen: boolean;
  accent: string;
  online: string[];
  pendingChat: string | null;
  pendingTask: string | null;
  pendingSnippet: string | null;
  pendingFile: string | null;
  pendingSettingTab: string | null;

  setOnline: (ids: string[]) => void;
  setSession: (user: AuthUser) => void;
  updateUser: (user: AuthUser) => void;
  logout: () => void;
  setWorkspaces: (workspaces: Workspace[]) => void;
  addWorkspace: (workspace: Workspace) => void;
  setWorkspace: (id: string) => void;
  setAccent: (c: string) => void;

  openApp: (id: AppId) => void;
  closeApp: (id: AppId) => void;
  minimizeApp: (id: AppId) => void;
  toggleMaximize: (id: AppId) => void;
  focusWindow: (id: AppId) => void;
  moveWindow: (id: AppId, x: number, y: number) => void;
  resizeWindow: (id: AppId, w: number, h: number) => void;

  setCommandOpen: (open: boolean) => void;
  toggleCommand: () => void;
  setNotifOpen: (open: boolean) => void;
  toggleNotif: () => void;
  setPendingChat: (channelId: string | null) => void;
  setPendingTask: (taskId: string | null) => void;
  setPendingSnippet: (snippetId: string | null) => void;
  setPendingFile: (fileId: string | null) => void;
  setPendingSettingTab: (tabId: string | null) => void;
}

function spawn(app: AppId, index: number, z: number): WinState {
  const size = DEFAULT_SIZE[app];
  return {
    app,
    x: 90 + index * 34,
    y: 24 + index * 30,
    w: size.w,
    h: size.h,
    z,
    minimized: false,
    maximized: false,
  };
}

export const useOS = create<OSState>((set) => ({
  loggedIn: false,
  user: null,
  workspaces: [],
  workspacesLoaded: false,
  activeWorkspace: "",
  windows: [],
  zTop: 1,
  commandOpen: false,
  notifOpen: false,
  accent: "#007aff",
  online: [],
  pendingChat: null,
  pendingTask: null,
  pendingSnippet: null,
  pendingFile: null,
  pendingSettingTab: null,

  setOnline: (ids) => set({ online: ids }),

  // Land on the desktop (no windows) — the user picks an app from the dock.
  setSession: (user) => set({ loggedIn: true, user, windows: [], zTop: 1 }),
  updateUser: (user) => set({ user }),
  logout: () =>
    set({
      loggedIn: false,
      user: null,
      workspaces: [],
      workspacesLoaded: false,
      activeWorkspace: "",
      windows: [],
      zTop: 1,
      commandOpen: false,
      notifOpen: false,
    }),

  setWorkspaces: (workspaces) =>
    set((s) => {
      const saved = typeof window !== "undefined" ? localStorage.getItem(WS_KEY) : null;
      const preferred = saved && workspaces.some((w) => w.id === saved) ? saved : null;
      const active = preferred
        ?? (workspaces.some((w) => w.id === s.activeWorkspace) ? s.activeWorkspace : null)
        ?? (workspaces[0]?.id ?? "");
      if (typeof window !== "undefined") localStorage.setItem(WS_KEY, active);
      return { workspaces, workspacesLoaded: true, activeWorkspace: active };
    }),

  addWorkspace: (workspace) => {
    if (typeof window !== "undefined") localStorage.setItem(WS_KEY, workspace.id);
    set((s) => ({
      workspaces: [...s.workspaces, workspace],
      workspacesLoaded: true,
      activeWorkspace: workspace.id,
    }));
  },

  setWorkspace: (id) => {
    if (typeof window !== "undefined") localStorage.setItem(WS_KEY, id);
    set({ activeWorkspace: id });
  },

  setAccent: (c) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("devcollab.accent", c);
      document.documentElement.style.setProperty("--accent", c);
    }
    set({ accent: c });
  },

  openApp: (id) =>
    set((s) => {
      const existing = s.windows.find((w) => w.app === id);
      const zTop = s.zTop + 1;
      if (existing) {
        return {
          zTop,
          windows: s.windows.map((w) =>
            w.app === id ? { ...w, minimized: false, z: zTop } : w,
          ),
        };
      }
      return {
        zTop,
        windows: [...s.windows, spawn(id, s.windows.length, zTop)],
      };
    }),

  closeApp: (id) =>
    set((s) => ({ windows: s.windows.filter((w) => w.app !== id) })),

  minimizeApp: (id) =>
    set((s) => ({
      windows: s.windows.map((w) =>
        w.app === id ? { ...w, minimized: true } : w,
      ),
    })),

  toggleMaximize: (id) =>
    set((s) => {
      const zTop = s.zTop + 1;
      return {
        zTop,
        windows: s.windows.map((w) =>
          w.app === id ? { ...w, maximized: !w.maximized, z: zTop } : w,
        ),
      };
    }),

  focusWindow: (id) =>
    set((s) => {
      const existing = s.windows.find((w) => w.app === id);
      if (!existing || existing.z === s.zTop) return s;
      const zTop = s.zTop + 1;
      return {
        zTop,
        windows: s.windows.map((w) => (w.app === id ? { ...w, z: zTop } : w)),
      };
    }),

  moveWindow: (id, x, y) =>
    set((s) => ({
      windows: s.windows.map((w) => (w.app === id ? { ...w, x, y } : w)),
    })),

  resizeWindow: (id, w, h) =>
    set((s) => ({
      windows: s.windows.map((win) =>
        win.app === id
          ? { ...win, w: Math.max(MIN_W, w), h: Math.max(MIN_H, h) }
          : win,
      ),
    })),

  setCommandOpen: (open) => set({ commandOpen: open }),
  toggleCommand: () => set((s) => ({ commandOpen: !s.commandOpen })),
  setNotifOpen: (open) => set({ notifOpen: open }),
  toggleNotif: () => set((s) => ({ notifOpen: !s.notifOpen })),
  setPendingChat: (id) => set({ pendingChat: id }),
  setPendingTask: (id) => set({ pendingTask: id }),
  setPendingSnippet: (id) => set({ pendingSnippet: id }),
  setPendingFile: (id) => set({ pendingFile: id }),
  setPendingSettingTab: (id) => set({ pendingSettingTab: id }),
}));

/** The focused (top-most, non-minimized) app, or null if the desktop is showing. */
export function focusedApp(windows: WinState[]): AppId | null {
  const visible = windows.filter((w) => !w.minimized);
  if (visible.length === 0) return null;
  return visible.reduce((top, w) => (w.z > top.z ? w : top)).app;
}
