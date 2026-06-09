"use client";

import { motion } from "framer-motion";
import { Lock, Mail } from "lucide-react";
import { useState } from "react";

function GithubMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
      <path d="M12 .5C5.7.5.5 5.7.5 12c0 5.1 3.3 9.4 7.9 10.9.6.1.8-.2.8-.5v-1.8c-3.2.7-3.9-1.4-3.9-1.4-.5-1.3-1.3-1.7-1.3-1.7-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.7 1.3 3.4 1 .1-.8.4-1.3.7-1.6-2.6-.3-5.3-1.3-5.3-5.7 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0C17 4.6 18 4.9 18 4.9c.6 1.6.2 2.8.1 3.1.8.8 1.2 1.8 1.2 3.1 0 4.4-2.7 5.4-5.3 5.7.4.4.8 1.1.8 2.2v3.3c0 .3.2.6.8.5 4.6-1.5 7.9-5.8 7.9-10.9C23.5 5.7 18.3.5 12 .5Z" />
    </svg>
  );
}
import { ThemeToggle } from "@/components/theme-toggle";
import { TrafficLights } from "@/components/os/traffic-lights";
import { useOS } from "@/stores/os";

export function LoginScreen() {
  const login = useOS((s) => s.login);
  const [mode, setMode] = useState<"signin" | "create">("signin");

  return (
    <div
      className="relative flex h-dvh w-full items-center justify-center overflow-hidden p-4"
      style={{
        background:
          "radial-gradient(120% 120% at 20% 0%, #2b6cb0 0%, #1a365d 38%, #0b1020 100%)",
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background:
            "radial-gradient(50% 45% at 80% 15%, rgba(191,90,242,0.4), transparent 60%), radial-gradient(45% 40% at 12% 88%, rgba(10,132,255,0.4), transparent 60%)",
        }}
      />
      <div className="absolute right-3 top-3 z-10">
        <ThemeToggle className="text-white/80 hover:bg-white/10 hover:text-white" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 280, damping: 26 }}
        className="glass-strong relative z-10 w-full max-w-sm overflow-hidden rounded-2xl border border-white/15 shadow-[var(--shadow-window)]"
      >
        <div className="flex h-11 items-center border-b border-separator px-4">
          <TrafficLights />
          <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-[13px] font-medium text-foreground/80">
            Sign in
          </span>
        </div>

        <div className="p-7">
          <div className="mb-6 flex flex-col items-center text-center">
            <span className="mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-accent text-2xl font-bold text-white shadow-lg">
              D
            </span>
            <h1 className="text-xl font-semibold tracking-tight">Welcome to DevCollab</h1>
            <p className="mt-1 text-sm text-muted">
              {mode === "signin" ? "Sign in to your workspace" : "Create your account"}
            </p>
          </div>

          {/* Segmented control */}
          <div className="mb-5 flex rounded-lg bg-hover p-0.5 text-sm">
            {(["signin", "create"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`flex-1 cursor-pointer rounded-md py-1.5 font-medium transition-colors ${
                  mode === m ? "bg-surface shadow-sm" : "text-muted"
                }`}
              >
                {m === "signin" ? "Sign in" : "Create account"}
              </button>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              login();
            }}
            className="space-y-3"
          >
            <label className="flex items-center gap-2 rounded-lg border border-separator bg-surface px-3 focus-within:border-accent">
              <Mail className="h-4 w-4 text-faint" />
              <input
                type="email"
                required
                defaultValue="illia@devcollab.app"
                placeholder="Email"
                aria-label="Email"
                className="h-10 flex-1 bg-transparent text-sm outline-none placeholder:text-faint"
              />
            </label>
            <label className="flex items-center gap-2 rounded-lg border border-separator bg-surface px-3 focus-within:border-accent">
              <Lock className="h-4 w-4 text-faint" />
              <input
                type="password"
                required
                defaultValue="password"
                placeholder="Password"
                aria-label="Password"
                className="h-10 flex-1 bg-transparent text-sm outline-none placeholder:text-faint"
              />
            </label>
            <button
              type="submit"
              className="h-10 w-full cursor-pointer rounded-lg bg-accent text-sm font-semibold text-accent-foreground transition hover:brightness-110"
            >
              {mode === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>

          <div className="my-4 flex items-center gap-3 text-xs text-faint">
            <span className="h-px flex-1 bg-separator" />
            or
            <span className="h-px flex-1 bg-separator" />
          </div>

          <button
            type="button"
            onClick={login}
            className="flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-separator bg-surface text-sm font-medium transition hover:bg-hover"
          >
            <GithubMark className="h-4 w-4" />
            Continue with GitHub
          </button>
        </div>
      </motion.div>
    </div>
  );
}
