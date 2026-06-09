"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      aria-label="Toggle theme"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-black/10 text-lg transition hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10"
    >
      {/* Avoid hydration mismatch: render a stable glyph until mounted */}
      {mounted ? (isDark ? "☀️" : "🌙") : "·"}
    </button>
  );
}
