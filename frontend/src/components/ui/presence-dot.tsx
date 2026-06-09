import type { Presence } from "@/lib/mock";
import { cn } from "@/lib/utils";

const COLOR: Record<Presence, string> = {
  online: "var(--success)",
  away: "var(--warning)",
  offline: "var(--faint)",
};

export function PresenceDot({
  state,
  size = 10,
  className,
}: {
  state: Presence;
  size?: number;
  className?: string;
}) {
  return (
    <span
      aria-label={state}
      className={cn("inline-block rounded-full ring-2 ring-surface", className)}
      style={{ width: size, height: size, background: COLOR[state] }}
    />
  );
}
