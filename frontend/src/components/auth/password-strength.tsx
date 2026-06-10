"use client";

import { Check, X } from "lucide-react";
import { evaluatePassword, type Strength } from "@/lib/password";
import { cn } from "@/lib/utils";

const META: Record<Strength, { label: string; color: string; bars: number }> = {
  weak: { label: "Weak", color: "var(--danger)", bars: 1 },
  medium: { label: "Medium", color: "var(--warning)", bars: 2 },
  strong: { label: "Strong", color: "var(--success)", bars: 3 },
};

export function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;
  const { strength, checks } = evaluatePassword(password);
  const m = META[strength];

  return (
    <div className="mt-2 space-y-2">
      <div className="flex items-center gap-2">
        <div className="flex h-1.5 flex-1 gap-1">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-full flex-1 rounded-full transition-colors"
              style={{ background: i < m.bars ? m.color : "var(--separator)" }}
            />
          ))}
        </div>
        <span className="text-xs font-semibold" style={{ color: m.color }}>
          {m.label}
        </span>
      </div>
      <ul className="grid grid-cols-2 gap-x-3 gap-y-1">
        {checks.map((c) => (
          <li
            key={c.id}
            className={cn(
              "flex items-center gap-1.5 text-[11px]",
              c.ok ? "text-success" : "text-muted",
            )}
          >
            {c.ok ? <Check className="h-3 w-3 shrink-0" /> : <X className="h-3 w-3 shrink-0 opacity-40" />}
            {c.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
