import { create } from "zustand";
import type { AppId } from "@/lib/apps";

interface OSState {
  loggedIn: boolean;
  activeApp: AppId | null; // null = desktop
  openApps: AppId[]; // running apps (dock indicator dots)
  minimized: AppId[];
  maximized: boolean;
  commandOpen: boolean;
  notifOpen: boolean;

  login: () => void;
  logout: () => void;
  openApp: (id: AppId) => void;
  closeApp: (id: AppId) => void;
  minimizeApp: (id: AppId) => void;
  toggleMaximize: () => void;
  goToDesktop: () => void;
  setCommandOpen: (open: boolean) => void;
  toggleCommand: () => void;
  setNotifOpen: (open: boolean) => void;
  toggleNotif: () => void;
}

export const useOS = create<OSState>((set) => ({
  loggedIn: false,
  activeApp: null,
  openApps: [],
  minimized: [],
  maximized: false,
  commandOpen: false,
  notifOpen: false,

  login: () => set({ loggedIn: true, activeApp: "chat", openApps: ["chat"] }),
  logout: () =>
    set({
      loggedIn: false,
      activeApp: null,
      openApps: [],
      minimized: [],
      maximized: false,
      commandOpen: false,
      notifOpen: false,
    }),

  openApp: (id) =>
    set((s) => ({
      activeApp: id,
      openApps: s.openApps.includes(id) ? s.openApps : [...s.openApps, id],
      minimized: s.minimized.filter((m) => m !== id),
    })),

  closeApp: (id) =>
    set((s) => {
      const openApps = s.openApps.filter((a) => a !== id);
      const minimized = s.minimized.filter((a) => a !== id);
      const activeApp =
        s.activeApp === id ? (openApps[openApps.length - 1] ?? null) : s.activeApp;
      return { openApps, minimized, activeApp };
    }),

  minimizeApp: (id) =>
    set((s) => ({
      minimized: s.minimized.includes(id) ? s.minimized : [...s.minimized, id],
      activeApp: null,
    })),

  toggleMaximize: () => set((s) => ({ maximized: !s.maximized })),
  goToDesktop: () => set({ activeApp: null }),

  setCommandOpen: (open) => set({ commandOpen: open }),
  toggleCommand: () => set((s) => ({ commandOpen: !s.commandOpen })),
  setNotifOpen: (open) => set({ notifOpen: open }),
  toggleNotif: () => set((s) => ({ notifOpen: !s.notifOpen })),
}));
