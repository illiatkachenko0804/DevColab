import { avatarGradient, cn, initials } from "@/lib/utils";

export function Avatar({
  name,
  size = 32,
  className,
  ring,
}: {
  name: string;
  size?: number;
  className?: string;
  ring?: boolean;
}) {
  return (
    <span
      role="img"
      aria-label={name}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-medium text-white select-none",
        ring && "ring-2 ring-surface",
        className,
      )}
      style={{
        width: size,
        height: size,
        background: avatarGradient(name),
        fontSize: size * 0.38,
      }}
    >
      {initials(name)}
    </span>
  );
}
