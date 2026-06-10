"use client";

import { motion } from "framer-motion";
import { FolderPlus } from "lucide-react";
import { useState } from "react";
import { TrafficLights } from "@/components/os/traffic-lights";
import { ThemeToggle } from "@/components/theme-toggle";
import { authErrorMessage, logout as apiLogout } from "@/lib/auth";
import { createWorkspace, workspaceInitial } from "@/lib/workspaces";
import { useOS } from "@/stores/os";

export function CreateProjectScreen() {
  const addWorkspace = useOS((s) => s.addWorkspace);
  const logoutLocal = useOS((s) => s.logout);
  const user = useOS((s) => s.user);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canCreate = name.trim().length >= 2;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canCreate) return;
    setLoading(true);
    setError(null);
    try {
      const ws = await createWorkspace(name.trim(), description.trim() || undefined);
      addWorkspace(ws);
    } catch (err) {
      setError(authErrorMessage(err).message);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      await apiLogout();
    } catch {
      /* clear locally regardless */
    }
    logoutLocal();
  };

  const initial = workspaceInitial(name) || "P";

  return (
    <div
      className="relative flex h-dvh w-full items-center justify-center overflow-auto p-4"
      style={{ background: "radial-gradient(120% 120% at 20% 0%, #2b6cb0 0%, #1a365d 38%, #0b1020 100%)" }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{ background: "radial-gradient(50% 45% at 80% 15%, rgba(191,90,242,0.4), transparent 60%), radial-gradient(45% 40% at 12% 88%, rgba(10,132,255,0.4), transparent 60%)" }}
      />
      <div className="absolute right-3 top-3 z-10">
        <ThemeToggle className="text-white/80 hover:bg-white/10 hover:text-white" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 280, damping: 26 }}
        className="glass-strong relative z-10 my-auto w-full max-w-md overflow-hidden rounded-2xl border border-white/15 shadow-[var(--shadow-window)]"
      >
        <div className="flex h-11 items-center border-b border-separator px-4">
          <TrafficLights />
          <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-[13px] font-medium text-foreground/80">
            New project
          </span>
        </div>

        <div className="p-7">
          <div className="mb-6 flex flex-col items-center text-center">
            <span className="mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-accent text-white shadow-lg">
              <FolderPlus className="h-7 w-7" />
            </span>
            <h1 className="text-xl font-semibold tracking-tight">Create your first project</h1>
            <p className="mt-1 text-sm text-muted">
              A project is a space for your team to chat, plan tasks and share code.
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
              {error}
            </div>
          )}

          {/* Live preview */}
          <div className="mb-5 flex items-center gap-3 rounded-xl border border-separator bg-surface/60 p-3">
            <span
              className="grid h-11 w-11 shrink-0 place-items-center rounded-[14px] text-sm font-semibold text-white"
              style={{ background: "var(--accent)" }}
            >
              {initial}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{name.trim() || "Project name"}</p>
              <p className="truncate text-xs text-muted">{description.trim() || "No description yet"}</p>
            </div>
          </div>

          <form onSubmit={submit} className="space-y-3">
            <div>
              <label htmlFor="ws-name" className="mb-1 block text-xs font-medium text-muted">
                Project name
              </label>
              <input
                id="ws-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={120}
                required
                placeholder="e.g. Orbit Mobile"
                className="h-10 w-full rounded-lg border border-separator bg-surface px-3 text-sm outline-none focus:border-accent"
              />
            </div>
            <div>
              <label htmlFor="ws-desc" className="mb-1 block text-xs font-medium text-muted">
                Description <span className="text-faint">(optional)</span>
              </label>
              <textarea
                id="ws-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={500}
                rows={3}
                placeholder="What is this project about?"
                className="w-full resize-none rounded-lg border border-separator bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !canCreate}
              className="h-10 w-full cursor-pointer rounded-lg bg-accent text-sm font-semibold text-accent-foreground transition hover:brightness-110 disabled:opacity-50"
            >
              {loading ? "Creating…" : "Create project"}
            </button>
          </form>

          <p className="mt-5 text-center text-xs text-muted">
            Signed in as {user?.email}.{" "}
            <button type="button" onClick={signOut} className="cursor-pointer text-accent hover:underline">
              Log out
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
