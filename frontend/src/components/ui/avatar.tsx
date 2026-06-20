import { avatarGradient, cn, initials } from "@/lib/utils";

export function Avatar({
  name,
  url,
  size = 32,
  className,
  ring,
}: {
  name: string;
  url?: string | null;
  size?: number;
  className?: string;
  ring?: boolean;
}) {
  return (
    <span
      role="img"
      aria-label={name}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-medium text-white select-none overflow-hidden",
        ring && "ring-2 ring-surface",
        className,
      )}
      style={{
        width: size,
        height: size,
        background: url ? `url(${url}) center/cover` : avatarGradient(name),
        fontSize: size * 0.38,
      }}
    >
      {!url && initials(name)}
    </span>
  );
}
