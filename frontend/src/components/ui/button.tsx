import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const button = cva(
  "inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-accent",
  {
    variants: {
      variant: {
        accent: "bg-accent text-accent-foreground hover:brightness-110",
        secondary:
          "border border-separator bg-surface text-foreground hover:bg-hover",
        ghost: "text-foreground/80 hover:bg-hover hover:text-foreground",
        danger: "bg-danger text-white hover:brightness-110",
      },
      size: {
        sm: "h-8 px-3",
        md: "h-9 px-4",
        lg: "h-11 px-5 text-[15px]",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: { variant: "accent", size: "md" },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof button> {}

export function Button({
  className,
  variant,
  size,
  ...props
}: ButtonProps) {
  return (
    <button className={cn(button({ variant, size }), className)} {...props} />
  );
}
