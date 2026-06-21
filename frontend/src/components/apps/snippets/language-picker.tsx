import { useState, useMemo, useRef, useEffect } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export const LANGUAGE_GROUPS = {
  "Web": ["html", "css", "scss", "less", "javascript", "typescript", "jsx", "tsx", "svelte", "vue", "astro"],
  "Backend": ["java", "kotlin", "scala", "go", "rust", "python", "ruby", "php", "csharp", "fsharp", "elixir", "erlang", "swift", "dart"],
  "Systems": ["c", "cpp", "zig", "nim", "assembly"],
  "Data & Config": ["json", "yaml", "toml", "xml", "csv", "graphql", "protobuf"],
  "Shell & DevOps": ["bash", "zsh", "fish", "powershell", "dockerfile", "hcl", "nix"],
  "Database": ["sql", "plsql", "prisma"],
  "Docs & Markup": ["markdown", "latex", "plaintext"],
  "Other": ["lua", "r", "matlab", "haskell", "clojure", "ocaml", "perl", "groovy", "v"]
} as const;

const ALL_LANGS = Object.values(LANGUAGE_GROUPS).flat();

interface Props {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function LanguagePicker({ value, onChange, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredGroups = useMemo(() => {
    if (!search.trim()) return LANGUAGE_GROUPS;
    const s = search.toLowerCase();
    const result: Record<string, string[]> = {};
    for (const [group, langs] of Object.entries(LANGUAGE_GROUPS)) {
      const filtered = langs.filter(l => l.includes(s));
      if (filtered.length > 0) result[group] = filtered;
    }
    return result;
  }, [search]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-md border border-separator bg-surface/50 px-3 py-1.5 text-sm hover:bg-separator/50 disabled:opacity-50"
      >
        <span>{value || "plaintext"}</span>
        <ChevronDown className="h-4 w-4 opacity-50" />
      </button>

      {open && (
        <div className="absolute top-full left-0 z-50 mt-1 w-64 rounded-md border border-separator bg-surface shadow-lg">
          <div className="flex items-center gap-2 border-b border-separator p-2">
            <Search className="h-4 w-4 opacity-50" />
            <input
              autoFocus
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              placeholder="Search languages..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="max-h-64 overflow-y-auto p-1">
            {Object.keys(filteredGroups).length === 0 ? (
              <div className="p-2 text-center text-sm text-muted-foreground">No results found</div>
            ) : (
              Object.entries(filteredGroups).map(([group, langs]) => (
                <div key={group} className="mb-2 last:mb-0">
                  <div className="px-2 py-1 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                    {group}
                  </div>
                  {langs.map((lang: string) => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => {
                        onChange(lang);
                        setOpen(false);
                      }}
                      className={cn(
                        "flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground",
                        value === lang && "bg-accent/10 font-medium text-accent"
                      )}
                    >
                      {lang}
                      {value === lang && <Check className="h-3.5 w-3.5" />}
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
