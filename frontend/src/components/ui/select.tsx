import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectOption {
  label: string;
  value: string;
}

export interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  disabled?: boolean;
  className?: string;
  placeholder?: string;
  variant?: "default" | "pill";
}

export function Select({ value, onChange, options, disabled, className, placeholder, variant = "default" }: SelectProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((o) => o.value === value);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={cn("relative", className)} ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className={cn(
          "flex w-full cursor-pointer items-center justify-between outline-none disabled:opacity-50 disabled:cursor-not-allowed",
          variant === "pill" 
            ? "rounded-full border border-transparent px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide hover:border-separator gap-1"
            : "rounded-lg border border-separator bg-surface px-3 py-2 text-sm focus:border-accent",
          variant === "default" && open && "border-accent",
          !selectedOption && "text-muted",
          className
        )}
      >
        <span className="truncate">{selectedOption ? selectedOption.label : (placeholder || "Select...")}</span>
        <ChevronDown className={cn("shrink-0 text-muted", variant === "pill" ? "h-3 w-3" : "h-4 w-4")} />
      </button>

      {open && !disabled && (
        <div className="absolute left-0 top-full z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-separator bg-surface p-1 shadow-[var(--shadow-pop)]">
          {options.length === 0 ? (
            <div className="p-2 text-center text-sm text-muted">No options</div>
          ) : (
            options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full cursor-pointer items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-hover",
                  value === option.value && "bg-accent/10 text-accent font-medium hover:bg-accent/20"
                )}
              >
                <span className="truncate">{option.label}</span>
                {value === option.value && <Check className="h-4 w-4 shrink-0" />}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
