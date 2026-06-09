"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CornerDownLeft, Hash, Search } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useMemo, useRef, useState } from "react";
import { APPS } from "@/lib/apps";
import { wsChannels, wsMembers } from "@/lib/mock";
import { cn } from "@/lib/utils";
import { useOS } from "@/stores/os";

interface Item {
  id: string;
  label: string;
  sub: string;
  group: string;
  run: () => void;
  icon?: React.ReactNode;
}

export function CommandPalette() {
  const open = useOS((s) => s.commandOpen);
  const setOpen = useOS((s) => s.setCommandOpen);
  const openApp = useOS((s) => s.openApp);
  const ws = useOS((s) => s.activeWorkspace);
  const { setTheme, resolvedTheme } = useTheme();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const items = useMemo<Item[]>(() => {
    const appItems: Item[] = APPS.map((a) => ({
      id: `app-${a.id}`,
      label: a.label,
      sub: "Open app",
      group: "Apps",
      run: () => openApp(a.id),
      icon: <a.icon className="h-4 w-4" style={{ color: a.accent }} />,
    }));
    const channelItems: Item[] = wsChannels(ws).map((c) => ({
      id: `ch-${c.id}`,
      label: `#${c.name}`,
      sub: "Channel",
      group: "Channels",
      run: () => openApp("chat"),
      icon: <Hash className="h-4 w-4 text-muted" />,
    }));
    const peopleItems: Item[] = wsMembers(ws).map((u) => ({
      id: `p-${u.id}`,
      label: u.name,
      sub: u.title,
      group: "People",
      run: () => openApp("members"),
    }));
    const actions: Item[] = [
      {
        id: "act-theme",
        label: `Switch to ${resolvedTheme === "dark" ? "light" : "dark"} mode`,
        sub: "Action",
        group: "Actions",
        run: () => setTheme(resolvedTheme === "dark" ? "light" : "dark"),
      },
    ];
    return [...appItems, ...channelItems, ...peopleItems, ...actions];
  }, [openApp, setTheme, resolvedTheme, ws]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => (i.label + i.sub).toLowerCase().includes(q));
  }, [items, query]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  useEffect(() => setActive(0), [query]);

  const choose = (item?: Item) => {
    if (!item) return;
    item.run();
    setOpen(false);
  };

  // Group for display while keeping a flat index for keyboard nav.
  const groups = useMemo(() => {
    const map = new Map<string, { item: Item; index: number }[]>();
    filtered.forEach((item, index) => {
      const arr = map.get(item.group) ?? [];
      arr.push({ item, index });
      map.set(item.group, arr);
    });
    return [...map.entries()];
  }, [filtered]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-start justify-center px-4 pt-[14vh]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setOpen(false)}
        >
          <div className="absolute inset-0 bg-black/30" />
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -8 }}
            transition={{ type: "spring", stiffness: 360, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            className="glass-strong relative w-full max-w-xl overflow-hidden rounded-2xl border border-separator shadow-[var(--shadow-pop)]"
            role="dialog"
            aria-label="Command palette"
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((a) => Math.min(a + 1, filtered.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => Math.max(a - 1, 0));
              } else if (e.key === "Enter") {
                e.preventDefault();
                choose(filtered[active]);
              } else if (e.key === "Escape") {
                setOpen(false);
              }
            }}
          >
            <div className="flex items-center gap-3 border-b border-separator px-4">
              <Search className="h-4 w-4 text-muted" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search apps, channels, people…"
                aria-label="Search"
                className="h-12 flex-1 bg-transparent text-[15px] outline-none placeholder:text-faint"
              />
              <kbd className="rounded border border-separator px-1.5 py-0.5 text-[10px] text-muted">ESC</kbd>
            </div>

            <div className="max-h-80 overflow-y-auto p-2 no-scrollbar">
              {filtered.length === 0 && (
                <p className="px-3 py-6 text-center text-sm text-muted">No results for “{query}”</p>
              )}
              {groups.map(([group, entries]) => (
                <div key={group} className="mb-1">
                  <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-faint">{group}</p>
                  {entries.map(({ item, index }) => (
                    <button
                      key={item.id}
                      type="button"
                      onMouseEnter={() => setActive(index)}
                      onClick={() => choose(item)}
                      className={cn(
                        "flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors",
                        active === index ? "bg-accent text-accent-foreground" : "hover:bg-hover",
                      )}
                    >
                      <span className="flex h-5 w-5 items-center justify-center">{item.icon ?? <span className="text-xs">{item.label[0]}</span>}</span>
                      <span className="flex-1 text-sm font-medium">{item.label}</span>
                      <span className={cn("text-xs", active === index ? "text-accent-foreground/70" : "text-faint")}>{item.sub}</span>
                      {active === index && <CornerDownLeft className="h-3.5 w-3.5" />}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
