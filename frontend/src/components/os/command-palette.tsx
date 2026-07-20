"use client";

import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { CheckSquare, Code2, CornerDownLeft, FileText, Folder, Hash, Search, User, Shield, Paintbrush, Bell, FolderKanban } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useMemo, useRef, useState } from "react";
import { APPS } from "@/lib/apps";
import { getBoard } from "@/lib/board";
import { listChannels } from "@/lib/chat";
import { listFiles } from "@/lib/files";
import { listMembers } from "@/lib/members";
import { listSnippets } from "@/lib/snippets";
import { cn } from "@/lib/utils";
import { useOS } from "@/stores/os";
import { Avatar } from "@/components/ui/avatar";

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
  
  const setPendingChat = useOS((s) => s.setPendingChat);
  const setPendingTask = useOS((s) => s.setPendingTask);
  const setPendingSnippet = useOS((s) => s.setPendingSnippet);
  const setPendingFile = useOS((s) => s.setPendingFile);
  const setPendingSettingTab = useOS((s) => s.setPendingSettingTab);
  
  const ws = useOS((s) => s.activeWorkspace);
  const { setTheme, resolvedTheme } = useTheme();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch data
  const channelsQuery = useQuery({ queryKey: ["channels", ws], queryFn: () => listChannels(ws), enabled: !!ws && open });
  const membersQuery = useQuery({ queryKey: ["members", ws], queryFn: () => listMembers(ws), enabled: !!ws && open });
  const boardQuery = useQuery({ queryKey: ["board", ws], queryFn: () => getBoard(ws), enabled: !!ws && open });
  const snippetsQuery = useQuery({ queryKey: ["snippets", ws], queryFn: () => listSnippets(ws), enabled: !!ws && open });
  const filesQuery = useQuery({ queryKey: ["files", ws], queryFn: () => listFiles(ws), enabled: !!ws && open });

  const items = useMemo<Item[]>(() => {
    const appItems: Item[] = APPS.map((a) => ({
      id: `app-${a.id}`,
      label: a.label,
      sub: "Open app",
      group: "Apps",
      run: () => openApp(a.id),
      icon: <a.icon className="h-4 w-4" style={{ color: a.accent }} />,
    }));
    
    const channelItems: Item[] = (channelsQuery.data ?? []).map((c) => ({
      id: `ch-${c.id}`,
      label: `#${c.name}`,
      sub: "Channel",
      group: "Channels",
      run: () => { setPendingChat(c.id); openApp("chat"); },
      icon: <Hash className="h-4 w-4 text-muted" />,
    }));
    
    const peopleItems: Item[] = (membersQuery.data ?? []).map((u) => ({
      id: `p-${u.id}`,
      label: u.displayName,
      sub: `@${u.devTag} • ${u.email}`,
      group: "People",
      run: () => { setPendingChat(u.id); openApp("chat"); },
      icon: <Avatar name={u.displayName} url={u.avatarUrl} size={16} />,
    }));

    const tasks = boardQuery.data?.columns.flatMap(c => c.tasks) ?? [];
    const taskItems: Item[] = tasks.map((t) => ({
      id: `t-${t.id}`,
      label: `${t.taskKey}: ${t.title}`,
      sub: `Task in ${boardQuery.data?.name}`,
      group: "Tasks",
      run: () => { setPendingTask(t.id); openApp("projects"); },
      icon: <CheckSquare className="h-4 w-4 text-muted" />,
    }));

    const snippetItems: Item[] = (snippetsQuery.data ?? []).map((s) => ({
      id: `s-${s.id}`,
      label: s.title,
      sub: s.language,
      group: "Snippets",
      run: () => { setPendingSnippet(s.id); openApp("snippets"); },
      icon: <Code2 className="h-4 w-4 text-muted" />,
    }));

    const fileItems: Item[] = (filesQuery.data ?? []).map((f) => ({
      id: `f-${f.id}`,
      label: f.name,
      sub: f.isFolder ? "Folder" : "File",
      group: "Files",
      run: () => { setPendingFile(f.id); openApp("files"); },
      icon: f.isFolder ? <Folder className="h-4 w-4 text-muted" /> : <FileText className="h-4 w-4 text-muted" />,
    }));

    const settingItems: Item[] = [
      { id: "set-profile", label: "Profile Settings", sub: "Name, DevTag, Avatar, Password", group: "Settings", run: () => { setPendingSettingTab("profile"); openApp("settings"); }, icon: <User className="h-4 w-4 text-muted" /> },
      { id: "set-security", label: "Security Settings", sub: "2FA, Two-Factor Authentication", group: "Settings", run: () => { setPendingSettingTab("security"); openApp("settings"); }, icon: <Shield className="h-4 w-4 text-muted" /> },
      { id: "set-appearance", label: "Appearance Settings", sub: "Theme, Dark Mode, Accent Color", group: "Settings", run: () => { setPendingSettingTab("appearance"); openApp("settings"); }, icon: <Paintbrush className="h-4 w-4 text-muted" /> },
      { id: "set-notifications", label: "Notification Settings", sub: "Direct messages, Tasks, Comments", group: "Settings", run: () => { setPendingSettingTab("notifications"); openApp("settings"); }, icon: <Bell className="h-4 w-4 text-muted" /> },
      { id: "set-project", label: "Project Settings", sub: "Roles, Permissions, Members", group: "Settings", run: () => { setPendingSettingTab("project"); openApp("settings"); }, icon: <FolderKanban className="h-4 w-4 text-muted" /> },
    ];

    const actions: Item[] = [
      {
        id: "act-theme",
        label: `Switch to ${resolvedTheme === "dark" ? "light" : "dark"} mode`,
        sub: "Action",
        group: "Actions",
        run: () => setTheme(resolvedTheme === "dark" ? "light" : "dark"),
      },
    ];
    return [...appItems, ...channelItems, ...peopleItems, ...taskItems, ...snippetItems, ...fileItems, ...settingItems, ...actions];
  }, [openApp, setPendingChat, setPendingTask, setPendingSnippet, setPendingFile, setPendingSettingTab, setTheme, resolvedTheme, channelsQuery.data, membersQuery.data, boardQuery.data, snippetsQuery.data, filesQuery.data]);

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
                placeholder="Search apps, channels, people, tasks..."
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
                      <span className="flex h-5 w-5 items-center justify-center shrink-0">{item.icon ?? <span className="text-xs">{item.label[0]}</span>}</span>
                      <span className="flex-1 text-sm font-medium truncate">{item.label}</span>
                      <span className={cn("text-xs truncate max-w-[200px]", active === index ? "text-accent-foreground/70" : "text-faint")}>{item.sub}</span>
                      {active === index && <CornerDownLeft className="h-3.5 w-3.5 shrink-0" />}
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
