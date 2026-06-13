"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AtSign, Hash, Plus, Search, Send, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import {
  createChannel,
  createDm,
  listChannels,
  listMessages,
  sendMessage,
  type Channel,
} from "@/lib/chat";
import { searchMembers } from "@/lib/members";
import { cn, relativeTime } from "@/lib/utils";
import { useOS } from "@/stores/os";

export function ChatApp() {
  const ws = useOS((s) => s.activeWorkspace);
  const workspaces = useOS((s) => s.workspaces);
  const wsName = workspaces.find((w) => w.id === ws)?.name ?? "Project";
  const qc = useQueryClient();

  const [selectedId, setSelectedId] = useState("");
  const [draft, setDraft] = useState("");
  const [newChannel, setNewChannel] = useState<string | null>(null);
  const [dmSearch, setDmSearch] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const channelsQuery = useQuery({
    queryKey: ["channels", ws],
    queryFn: () => listChannels(ws),
    enabled: !!ws,
  });
  const channels = channelsQuery.data ?? [];
  const texts = channels.filter((c) => c.type === "TEXT");
  const dms = channels.filter((c) => c.type === "DM");

  // Keep a valid selection.
  useEffect(() => {
    if (channels.length === 0) {
      if (selectedId) setSelectedId("");
      return;
    }
    if (!channels.some((c) => c.id === selectedId)) {
      setSelectedId(texts[0]?.id ?? channels[0].id);
    }
  }, [channels, selectedId, texts]);

  const selected = channels.find((c) => c.id === selectedId);

  const messagesQuery = useQuery({
    queryKey: ["messages", selectedId],
    queryFn: () => listMessages(selectedId),
    enabled: !!selectedId,
    refetchInterval: 4000, // near-real-time until WebSocket lands
  });
  const messages = messagesQuery.data ?? [];

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, selectedId]);

  const send = useMutation({
    mutationFn: (content: string) => sendMessage(selectedId, content),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["messages", selectedId] }),
  });

  const addChannel = useMutation({
    mutationFn: (name: string) => createChannel(ws, name),
    onSuccess: (ch) => {
      qc.invalidateQueries({ queryKey: ["channels", ws] });
      setSelectedId(ch.id);
      setNewChannel(null);
    },
  });

  const openDm = useMutation({
    mutationFn: (userId: string) => createDm(ws, userId),
    onSuccess: (ch) => {
      qc.invalidateQueries({ queryKey: ["channels", ws] });
      setSelectedId(ch.id);
      setDmSearch(null);
    },
  });

  const onSend = () => {
    const body = draft.trim();
    if (!body || !selectedId) return;
    setDraft("");
    send.mutate(body);
  };

  return (
    <div className="flex min-h-0 flex-1">
      {/* Sidebar */}
      <div className="hidden w-60 shrink-0 flex-col border-r border-separator bg-sidebar md:flex">
        <div className="border-b border-separator px-4 py-3">
          <p className="text-sm font-semibold">{wsName}</p>
        </div>
        <nav className="flex-1 overflow-y-auto p-2 no-scrollbar">
          {/* Channels */}
          <div className="flex items-center justify-between px-2 py-1">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-faint">Channels</span>
            <button type="button" aria-label="New channel" onClick={() => { setNewChannel(""); setDmSearch(null); }} className="cursor-pointer text-faint hover:text-foreground">
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
          {texts.map((c) => (
            <ChannelRow key={c.id} channel={c} active={c.id === selectedId} onClick={() => setSelectedId(c.id)} />
          ))}
          {newChannel !== null && (
            <form
              onSubmit={(e) => { e.preventDefault(); if (newChannel.trim()) addChannel.mutate(newChannel.trim()); }}
              className="flex items-center gap-1 px-2 py-1"
            >
              <Hash className="h-4 w-4 text-faint" />
              <input
                autoFocus
                value={newChannel}
                onChange={(e) => setNewChannel(e.target.value)}
                onBlur={() => !newChannel.trim() && setNewChannel(null)}
                placeholder="new-channel"
                className="w-full rounded border border-separator bg-surface px-1.5 py-1 text-sm outline-none focus:border-accent"
              />
            </form>
          )}

          {/* Direct messages */}
          <div className="mt-3 flex items-center justify-between px-2 py-1">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-faint">Direct messages</span>
            <button type="button" aria-label="New message" onClick={() => { setDmSearch(""); setNewChannel(null); }} className="cursor-pointer text-faint hover:text-foreground">
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
          {dms.map((c) => (
            <ChannelRow key={c.id} channel={c} active={c.id === selectedId} onClick={() => setSelectedId(c.id)} />
          ))}
        </nav>
      </div>

      {/* Thread */}
      <div className="relative flex min-w-0 flex-1 flex-col">
        {dmSearch !== null && (
          <DmSearch ws={ws} onClose={() => setDmSearch(null)} onPick={(id) => openDm.mutate(id)} />
        )}

        {!selected ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center text-muted">
            <Hash className="h-9 w-9 opacity-40" />
            <p className="text-sm">No channels in {wsName} yet. Create one with the + above.</p>
          </div>
        ) : (
          <>
            <div className="flex h-12 shrink-0 items-center gap-2 border-b border-separator px-4">
              {selected.type === "DM" ? <AtSign className="h-4 w-4 text-muted" /> : <Hash className="h-4 w-4 text-muted" />}
              <span className="font-semibold">{selected.name}</span>
              {selected.type === "DM" && selected.peerDevTag && (
                <span className="text-sm text-muted">@{selected.peerDevTag}</span>
              )}
            </div>

            <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4 no-scrollbar">
              {messages.length === 0 && (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-muted">
                  {selected.type === "DM" ? <AtSign className="h-8 w-8 opacity-40" /> : <Hash className="h-8 w-8 opacity-40" />}
                  <p className="text-sm">
                    This is the start of {selected.type === "DM" ? `your conversation with ${selected.name}` : `#${selected.name}`}.
                  </p>
                </div>
              )}
              {messages.map((m, i) => {
                const grouped = messages[i - 1]?.author.id === m.author.id;
                return (
                  <div key={m.id} className={cn("flex gap-3", grouped && "mt-[-8px]")}>
                    <div className="w-9 shrink-0">{!grouped && <Avatar name={m.author.displayName} size={36} />}</div>
                    <div className="min-w-0 flex-1">
                      {!grouped && (
                        <div className="flex items-baseline gap-2">
                          <span className="text-sm font-semibold">{m.author.displayName}</span>
                          <span className="text-xs text-faint">{relativeTime(m.createdAt)}</span>
                        </div>
                      )}
                      <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-foreground/90">{m.content}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="shrink-0 border-t border-separator p-3">
              <div className="flex items-center gap-2 rounded-xl border border-separator bg-surface px-3 py-1.5 focus-within:border-accent">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(); } }}
                  rows={1}
                  placeholder={selected.type === "DM" ? `Message ${selected.name}` : `Message #${selected.name}`}
                  aria-label="Message"
                  className="block max-h-32 flex-1 resize-none self-center bg-transparent py-1 text-[15px] leading-6 outline-none placeholder:text-faint"
                />
                <button type="button" onClick={onSend} disabled={!draft.trim()} aria-label="Send" className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-accent text-accent-foreground transition hover:brightness-110 disabled:opacity-40">
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ChannelRow({ channel, active, onClick }: { channel: Channel; active: boolean; onClick: () => void }) {
  const Icon = channel.type === "DM" ? AtSign : Hash;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
        active ? "bg-accent text-accent-foreground" : "text-foreground/80 hover:bg-hover",
      )}
    >
      {channel.type === "DM" ? (
        <Avatar name={channel.name} size={18} />
      ) : (
        <Icon className="h-4 w-4 opacity-70" />
      )}
      <span className="flex-1 truncate text-left">{channel.name}</span>
    </button>
  );
}

function DmSearch({ ws, onClose, onPick }: { ws: string; onClose: () => void; onPick: (id: string) => void }) {
  const [q, setQ] = useState("");
  const results = useQuery({
    queryKey: ["memberSearch", ws, q],
    queryFn: () => searchMembers(ws, q),
    enabled: !!ws,
  });
  const members = results.data ?? [];

  return (
    <div className="absolute inset-x-0 top-0 z-20 border-b border-separator bg-surface p-3 shadow-[var(--shadow-card)]">
      <div className="mb-2 flex items-center gap-2">
        <Search className="h-4 w-4 text-faint" />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search members in this project…"
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-faint"
        />
        <button type="button" aria-label="Close" onClick={onClose} className="cursor-pointer text-faint hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="max-h-56 overflow-y-auto no-scrollbar">
        {members.length === 0 && <p className="px-2 py-3 text-center text-sm text-muted">No members found.</p>}
        {members.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => onPick(m.id)}
            className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-hover"
          >
            <Avatar name={m.displayName} size={28} />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{m.displayName}</p>
              <p className="truncate text-xs text-muted">@{m.devTag}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
