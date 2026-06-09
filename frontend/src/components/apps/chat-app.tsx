"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Hash, Plus, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { CodeBlock } from "@/components/ui/code-block";
import { PresenceDot } from "@/components/ui/presence-dot";
import {
  channels,
  currentUser,
  messagesByChannel,
  userById,
  users,
  workspaces,
  type Message,
} from "@/lib/mock";
import { cn, relativeTime } from "@/lib/utils";

export function ChatApp() {
  const [activeWs, setActiveWs] = useState(workspaces[0].id);
  const [activeChannel, setActiveChannel] = useState("c2");
  const [extra, setExtra] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const channel = channels.find((c) => c.id === activeChannel)!;
  const thread = [...messagesByChannel(activeChannel), ...extra.filter((m) => m.channelId === activeChannel)];
  const online = users.filter((u) => u.presence === "online");

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [thread.length, typing]);

  const send = () => {
    const body = draft.trim();
    if (!body) return;
    setExtra((p) => [
      ...p,
      { id: `local-${Date.now()}`, channelId: activeChannel, userId: currentUser.id, body, at: new Date().toISOString() },
    ]);
    setDraft("");
    setTyping(true);
    setTimeout(() => setTyping(false), 2600);
  };

  return (
    <div className="flex min-h-0 flex-1">
      {/* Workspace rail */}
      <div className="hidden w-16 shrink-0 flex-col items-center gap-2 border-r border-separator bg-sidebar py-3 sm:flex">
        {workspaces.map((w) => (
          <button
            key={w.id}
            type="button"
            onClick={() => setActiveWs(w.id)}
            aria-label={w.name}
            title={w.name}
            className={cn(
              "flex h-11 w-11 cursor-pointer items-center justify-center rounded-[14px] text-sm font-semibold text-white transition",
              activeWs === w.id ? "ring-2 ring-accent ring-offset-2 ring-offset-sidebar" : "opacity-80 hover:opacity-100",
            )}
            style={{ background: w.accent }}
          >
            {w.initial}
          </button>
        ))}
        <button
          type="button"
          aria-label="New workspace"
          className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-[14px] border border-dashed border-separator text-faint transition hover:text-foreground"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>

      {/* Channels sidebar */}
      <div className="hidden w-56 shrink-0 flex-col border-r border-separator bg-sidebar md:flex">
        <div className="border-b border-separator px-4 py-3">
          <p className="text-sm font-semibold">{workspaces.find((w) => w.id === activeWs)?.name}</p>
          <p className="text-xs text-muted">{users.length} members</p>
        </div>
        <nav className="flex-1 overflow-y-auto p-2 no-scrollbar">
          <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-faint">Channels</p>
          {channels.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setActiveChannel(c.id)}
              className={cn(
                "flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                activeChannel === c.id ? "bg-accent text-accent-foreground" : "text-foreground/80 hover:bg-hover",
              )}
            >
              <Hash className="h-4 w-4 opacity-70" />
              <span className="flex-1 text-left">{c.name}</span>
              {c.unread > 0 && activeChannel !== c.id && (
                <span className="rounded-full bg-danger px-1.5 text-[10px] font-semibold text-white">{c.unread}</span>
              )}
            </button>
          ))}
          <p className="mt-3 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-faint">Online — {online.length}</p>
          {online.map((u) => (
            <div key={u.id} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-foreground/80">
              <span className="relative">
                <Avatar name={u.name} size={22} />
                <PresenceDot state={u.presence} size={8} className="absolute -bottom-0.5 -right-0.5" />
              </span>
              {u.name.split(" ")[0]}
            </div>
          ))}
        </nav>
      </div>

      {/* Thread */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-12 shrink-0 items-center gap-2 border-b border-separator px-4">
          <Hash className="h-4 w-4 text-muted" />
          <span className="font-semibold">{channel.name}</span>
          <span className="hidden text-sm text-muted sm:inline">· macOS UI polish & shipping</span>
          <div className="ml-auto flex -space-x-2">
            {online.slice(0, 4).map((u) => (
              <Avatar key={u.id} name={u.name} size={24} ring />
            ))}
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4 no-scrollbar">
          {thread.map((m, i) => {
            const author = userById(m.userId);
            const prev = thread[i - 1];
            const grouped = prev?.userId === m.userId;
            return (
              <div key={m.id} className={cn("flex gap-3", grouped && "mt-[-8px]")}>
                <div className="w-9 shrink-0">
                  {!grouped && <Avatar name={author.name} size={36} />}
                </div>
                <div className="min-w-0 flex-1">
                  {!grouped && (
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-semibold">{author.name}</span>
                      <span className="text-xs text-faint">{relativeTime(m.at)}</span>
                    </div>
                  )}
                  <p className="text-[15px] leading-relaxed text-foreground/90">{m.body}</p>
                  {m.code && <CodeBlock code={m.code.content} lang={m.code.lang} className="mt-2 max-w-lg" />}
                </div>
              </div>
            );
          })}

          <AnimatePresence>
            {typing && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2 pl-12 text-sm text-muted"
              >
                <span className="flex gap-1">
                  {[0, 1, 2].map((d) => (
                    <motion.span
                      key={d}
                      className="h-1.5 w-1.5 rounded-full bg-muted"
                      animate={{ y: [0, -3, 0] }}
                      transition={{ repeat: Infinity, duration: 0.9, delay: d * 0.15 }}
                    />
                  ))}
                </span>
                Maria Kovac is typing…
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Composer */}
        <div className="shrink-0 border-t border-separator p-3">
          <div className="flex items-end gap-2 rounded-xl border border-separator bg-surface px-3 py-2 focus-within:border-accent">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              rows={1}
              placeholder={`Message #${channel.name}`}
              aria-label={`Message ${channel.name}`}
              className="max-h-32 flex-1 resize-none bg-transparent text-[15px] outline-none placeholder:text-faint"
            />
            <button
              type="button"
              onClick={send}
              disabled={!draft.trim()}
              aria-label="Send message"
              className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-accent text-accent-foreground transition hover:brightness-110 disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
