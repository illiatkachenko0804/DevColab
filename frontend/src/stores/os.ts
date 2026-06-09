import { create } from "zustand";
import type { AppId } from "@/lib/apps";

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

const DEFAULT_SIZE: Record<AppId, { w: number; h: number }> = {
  chat: { w: 880, h: 600 },
  projects: { w: 920, h: 600 },
  snippets: { w: 840, h: 560 },
  activity: { w: 700, h: 560 },
  members: { w: 760, h: 540 },
  settings: { w: 720, h: 520 },
};

interface OSState {
  loggedIn: boolean;
  activeWorkspace: string;
  windows: WinState[];
  zTop: number;
  commandOpen: boolean;
  notifOpen: boolean;

  login: () => void;
  logout: () => void;
  setWorkspace: (id: string) => void;

  openApp: (id: AppId) => void;
  closeApp: (id: AppId) => void;
  minimizeApp: (id: AppId) => void;
  toggleMaximize: (id: AppId) => void;
  focusWindow: (id: AppId) => void;
  moveWindow: (id: AppId, x: number, y: number) => void;

  setCommandOpen: (open: boolean) => void;
  toggleCommand: () => void;
  setNotifOpen: (open: boolean) => void;
  toggleNotif: () => void;
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
  activeWorkspace: "w1",
  windows: [],
  zTop: 1,
  commandOpen: false,
  notifOpen: false,

  login: () =>
    set({ loggedIn: true, windows: [spawn("chat", 0, 2)], zTop: 2 }),
  logout: () =>
    set({
      loggedIn: false,
      windows: [],
      zTop: 1,
      commandOpen: false,
      notifOpen: false,
    }),

  setWorkspace: (id) => set({ activeWorkspace: id }),

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

  setCommandOpen: (open) => set({ commandOpen: open }),
  toggleCommand: () => set((s) => ({ commandOpen: !s.commandOpen })),
  setNotifOpen: (open) => set({ notifOpen: open }),
  toggleNotif: () => set((s) => ({ notifOpen: !s.notifOpen })),
}));

/** The focused (top-most, non-minimized) app, or null if the desktop is showing. */
export function focusedApp(windows: WinState[]): AppId | null {
  const visible = windows.filter((w) => !w.minimized);
  if (visible.length === 0) return null;
  return visible.reduce((top, w) => (w.z > top.z ? w : top)).app;
}
