"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  AtSign, Hash, Plus, Search, Send, Settings, UserPlus, X, 
  Users, Trash2, Bold, Italic, Underline as UnderlineIcon, Strikethrough, Code, Link as LinkIcon, 
  List, ListOrdered, ImageIcon, Type, Quote, Terminal, Eraser
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { Markdown } from "tiptap-markdown";

import { Avatar } from "@/components/ui/avatar";
import {
  addChannelMember,
  createChannel,
  createDm,
  listChannelMembers,
  listChannels,
  listMessages,
  markChannelRead,
  removeChannelMember,
  sendMessage,
  updateChannel,
  type Channel,
  type ChannelMember,
  type ChatMessage,
  type TypingEvent,
} from "@/lib/chat";
import { searchMembers } from "@/lib/members";
import { uploadFile, fileUrl } from "@/lib/files";
import { cn } from "@/lib/utils";
import type { AppId } from "@/lib/apps";
import { relativeTime } from "@/lib/utils";
import { publish, subscribe } from "@/lib/ws";
import { useOS } from "@/stores/os";

export function ChatApp() {
  const ws = useOS((s) => s.activeWorkspace);
  const workspaces = useOS((s) => s.workspaces);
  const me = useOS((s) => s.user);
  const online = useOS((s) => s.online);
  const wsName = workspaces.find((w) => w.id === ws)?.name ?? "Project";
  const qc = useQueryClient();

  const [selectedId, setSelectedId] = useState("");
  const [newChannel, setNewChannel] = useState<string | null>(null);
  const [dmSearch, setDmSearch] = useState<string | null>(null);
  const [addPeople, setAddPeople] = useState(false);
  const [editChannel, setEditChannel] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Record<string, string>>({});
  const scrollRef = useRef<HTMLDivElement>(null);

  const channelsQuery = useQuery({ queryKey: ["channels", ws], queryFn: () => listChannels(ws), enabled: !!ws });
  const channels = channelsQuery.data ?? [];
  const texts = channels.filter((c) => c.type === "TEXT");
  const dms = channels.filter((c) => c.type === "DM");

  const pendingChat = useOS((s) => s.pendingChat);
  const setPendingChat = useOS((s) => s.setPendingChat);

  useEffect(() => {
    if (channels.length === 0) {
      if (selectedId) setSelectedId("");
      return;
    }
    if (!channels.some((c) => c.id === selectedId)) {
      setSelectedId(texts[0]?.id ?? channels[0].id);
    }
  }, [channels, selectedId, texts]);

  // Deep-link from toast notification: switch to the requested channel.
  useEffect(() => {
    if (pendingChat && channels.some((c) => c.id === pendingChat)) {
      setSelectedId(pendingChat);
      setPendingChat(null);
    }
  }, [pendingChat, channels, setPendingChat]);

  const selected = channels.find((c) => c.id === selectedId);

  const messagesQuery = useQuery({
    queryKey: ["messages", selectedId],
    queryFn: () => listMessages(selectedId),
    enabled: !!selectedId,
  });
  const messages = messagesQuery.data ?? [];

  const membersQuery = useQuery({
    queryKey: ["channelMembers", selectedId],
    queryFn: () => listChannelMembers(selectedId),
    enabled: !!selectedId && selected?.type === "TEXT"
  });
  const inChannel = membersQuery.data ?? [];

  const markRead = (id: string) => {
    markChannelRead(id)
      .then(() => {
        qc.invalidateQueries({ queryKey: ["channels", ws] });
        qc.invalidateQueries({ queryKey: ["notifications", ws] });
      })
      .catch(() => {});
  };

  useEffect(() => {
    if (selectedId) markRead(selectedId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const stateRef = useRef({ selectedId, meId: me?.id });
  useEffect(() => {
    stateRef.current = { selectedId, meId: me?.id };
  }, [selectedId, me?.id]);

  // Live channel updates (name, image, etc.)
  useEffect(() => {
    if (!ws) return;
    const unsub = subscribe(`/topic/workspace.${ws}.channels`, (raw) => {
      const payload = raw as any;
      if (payload.type === "SYSTEM_KICK") {
        if (payload.userId === stateRef.current.meId) {
          if (stateRef.current.selectedId === payload.channelId) setSelectedId("");
          qc.invalidateQueries({ queryKey: ["channels", ws] });
        } else {
          if (stateRef.current.selectedId === payload.channelId) {
            qc.invalidateQueries({ queryKey: ["channelMembers", payload.channelId] });
          }
        }
        return;
      }

      const updatedChannel = raw as Channel;
      qc.setQueryData<Channel[]>(["channels", ws], (old) => {
        if (!old) return old;
        return old.map((c) => c.id === updatedChannel.id ? { ...c, ...updatedChannel } : c);
      });
    });
    return () => unsub();
  }, [ws, qc, subscribe]);

  // Live messages over WebSocket.
  useEffect(() => {
    if (!selectedId) return;
    const unsub = subscribe(`/topic/channel.${selectedId}`, (raw) => {
      const msg = raw as ChatMessage;

      qc.setQueryData<ChatMessage[]>(["messages", selectedId], (old) => {
        const list = old ?? [];
        return list.some((m) => m.id === msg.id) ? list : [...list, msg];
      });
      markRead(selectedId);
    });
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, qc]);

  // Live typing indicator.
  useEffect(() => {
    if (!selectedId) return;
    setTypingUsers({});
    const timers: Record<string, ReturnType<typeof setTimeout>> = {};
    const unsub = subscribe(`/topic/channel.${selectedId}.typing`, (raw) => {
      const ev = raw as TypingEvent;
      if (ev.userId === me?.id) return;
      setTypingUsers((prev) => {
        const next = { ...prev };
        if (ev.typing) next[ev.userId] = ev.displayName;
        else delete next[ev.userId];
        return next;
      });
      clearTimeout(timers[ev.userId]);
      if (ev.typing) {
        timers[ev.userId] = setTimeout(() => {
          setTypingUsers((prev) => {
            const n = { ...prev };
            delete n[ev.userId];
            return n;
          });
        }, 5000);
      }
    });
    return () => {
      unsub();
      Object.values(timers).forEach(clearTimeout);
    };
  }, [selectedId, me?.id]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, selectedId, typingUsers]);

  // Reset state when switching channels.
  useEffect(() => {
    setAddPeople(false);
    setEditChannel(false);
    setShowParticipants(false);
  }, [selectedId]);

  const send = useMutation({
    mutationFn: (content: string) => sendMessage(selectedId, content),
    onSuccess: (msg) => {
      qc.setQueryData<ChatMessage[]>(["messages", selectedId], (old) => {
        const list = old ?? [];
        return list.some((m) => m.id === msg.id) ? list : [...list, msg];
      });
    },
  });

  const addChannel = useMutation({
    mutationFn: (name: string) => createChannel(ws, name),
    onSuccess: (ch) => { qc.invalidateQueries({ queryKey: ["channels", ws] }); setSelectedId(ch.id); setNewChannel(null); },
  });

  const openDm = useMutation({
    mutationFn: (userId: string) => createDm(ws, userId),
    onSuccess: (ch) => { qc.invalidateQueries({ queryKey: ["channels", ws] }); setSelectedId(ch.id); setDmSearch(null); },
  });

  const typingNames = Object.values(typingUsers);

  return (
    <div className="flex min-h-0 flex-1">
      {/* Sidebar */}
      <div className="hidden w-60 shrink-0 flex-col border-r border-separator bg-sidebar md:flex">
        <div className="border-b border-separator px-4 py-3"><p className="text-sm font-semibold">{wsName}</p></div>
        <nav className="flex-1 overflow-y-auto p-2 no-scrollbar">
          <div className="flex items-center justify-between px-2 py-1">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-faint">Channels</span>
            <button type="button" aria-label="New channel" onClick={() => { setNewChannel(""); setDmSearch(null); }} className="cursor-pointer text-faint hover:text-foreground"><Plus className="h-3.5 w-3.5" /></button>
          </div>
          {texts.map((c) => <ChannelRow key={c.id} channel={c} active={c.id === selectedId} onClick={() => setSelectedId(c.id)} />)}
          {newChannel !== null && (
            <form onSubmit={(e) => { e.preventDefault(); if (newChannel.trim()) addChannel.mutate(newChannel.trim()); }} className="flex items-center gap-1 px-2 py-1">
              <Hash className="h-4 w-4 text-faint" />
              <input autoFocus value={newChannel} onChange={(e) => setNewChannel(e.target.value)} placeholder="new-channel" className="w-full rounded border border-separator bg-surface px-1.5 py-1 text-sm outline-none focus:border-accent" />
            </form>
          )}

          <div className="mt-3 flex items-center justify-between px-2 py-1">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-faint">Direct messages</span>
            <button type="button" aria-label="New message" onClick={() => { setDmSearch(""); setNewChannel(null); }} className="cursor-pointer text-faint hover:text-foreground"><Plus className="h-3.5 w-3.5" /></button>
          </div>
          {dms.map((c) => <ChannelRow key={c.id} channel={c} active={c.id === selectedId} onClick={() => setSelectedId(c.id)} />)}
        </nav>
      </div>

      {/* Thread */}
      <div className="relative flex min-w-0 flex-1 flex-col">
        {dmSearch !== null && <DmSearch ws={ws} onClose={() => setDmSearch(null)} onPick={(id) => openDm.mutate(id)} />}
        {addPeople && selected?.type === "TEXT" && <AddPeople ws={ws} channelId={selectedId} onClose={() => setAddPeople(false)} />}
        {editChannel && selected?.type === "TEXT" && <EditChannelDialog ws={ws} channel={selected} onClose={() => setEditChannel(false)} />}

        {!selected ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center text-muted">
            <Hash className="h-9 w-9 opacity-40" />
            <p className="text-sm">No channels in {wsName} yet. Create one with the + above.</p>
          </div>
        ) : (
          <>
            <div className="flex min-h-12 shrink-0 items-center gap-2 border-b border-separator px-4 py-2">
              {selected.type === "DM" ? <AtSign className="h-4 w-4 text-muted shrink-0" /> : (
                selected.imageUrl ? <img src={selected.imageUrl} alt="" className="h-5 w-5 shrink-0 rounded object-cover" /> : <Hash className="h-4 w-4 text-muted shrink-0" />
              )}
              <div className="flex flex-col min-w-0">
                <span className="font-semibold truncate leading-tight">{selected.name}</span>
                {selected.description && <span className="text-[11px] text-muted truncate leading-tight mt-0.5">{selected.description}</span>}
              </div>
              {selected.type === "DM" && selected.peerDevTag && <span className="text-sm text-muted ml-1">@{selected.peerDevTag}</span>}
              {selected.type === "TEXT" && (
                <div className="ml-auto flex gap-2 shrink-0">
                  <button type="button" onClick={() => { setShowParticipants((v) => !v); setAddPeople(false); setEditChannel(false); }} aria-label="Participants" className={cn("flex cursor-pointer items-center gap-1.5 rounded-lg border border-separator px-2.5 py-1 text-xs transition hover:bg-hover hover:text-foreground", showParticipants ? "bg-accent/10 text-accent border-accent/30" : "text-muted")}>
                    <Users className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Participants</span>
                  </button>
                  <button type="button" onClick={() => { setAddPeople((v) => !v); setEditChannel(false); setShowParticipants(false); }} aria-label="Add people" className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-separator px-2.5 py-1 text-xs text-muted transition hover:bg-hover hover:text-foreground">
                    <UserPlus className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Add people</span>
                  </button>
                  {selected.adminId === me?.id && (
                    <button type="button" onClick={() => { setEditChannel((v) => !v); setAddPeople(false); setShowParticipants(false); }} aria-label="Settings" className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-separator px-2.5 py-1 text-xs text-muted transition hover:bg-hover hover:text-foreground">
                      <Settings className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Edit</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="flex min-h-0 flex-1 relative">
              {/* Message List */}
              <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4 no-scrollbar">
                {messages.length === 0 && (
                  <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-muted">
                    {selected.type === "DM" ? <AtSign className="h-8 w-8 opacity-40" /> : <Hash className="h-8 w-8 opacity-40" />}
                    <p className="text-sm">This is the start of {selected.type === "DM" ? `your conversation with ${selected.name}` : `#${selected.name}`}.</p>
                  </div>
                )}
                {messages.map((m, i) => {
                  if (m.content.startsWith("[SYSTEM_EVENT] ")) {
                    const sysText = m.content.replace("[SYSTEM_EVENT] ", "");
                    return (
                      <div key={m.id} className="my-4 flex items-center justify-center">
                        <div className="flex w-full items-center justify-center px-4">
                          <div className="h-px flex-1 bg-separator"></div>
                          <span className="px-4 text-xs font-medium text-faint">
                            {sysText}
                          </span>
                          <div className="h-px flex-1 bg-separator"></div>
                        </div>
                      </div>
                    );
                  }

                  const prev = messages[i - 1];
                  const grouped = prev?.author.id === m.author.id && !prev?.content.startsWith("[SYSTEM_EVENT] ");
                  const isImportant = m.content.toLowerCase().includes("!important");
                  const contentToRender = m.content.replace(/!important/gi, "").trim();
                  
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
                        <div className={cn("text-[15px] leading-relaxed text-foreground/90 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-1 [&_strong]:font-bold [&_em]:italic [&_del]:line-through [&_a]:text-accent [&_a:hover]:underline [&_pre]:bg-surface [&_pre]:p-2 [&_pre]:rounded [&_code]:bg-surface [&_code]:px-1 [&_code]:rounded", isImportant && "border-l-2 border-danger pl-3 mt-1")}>
                          {isImportant && <div className="text-[10px] font-bold text-danger uppercase mb-0.5 tracking-wider">!!Important</div>}
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            urlTransform={(value: string) => value}
                            components={{
                              a: ({ href, children }) => {
                                if (href?.includes("mention://")) {
                                  return <span className="bg-accent/20 text-accent font-semibold px-1 rounded">{children}</span>;
                                }
                                const match = href?.match(/projects:\/\/task\/([^"'\s]+)/);
                                if (match) {
                                  return (
                                    <button 
                                      type="button"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        useOS.getState().setPendingTask(match[1]);
                                        useOS.getState().openApp("projects");
                                      }} 
                                      className="text-accent hover:underline decoration-accent underline-offset-2 inline-flex items-center gap-1 font-medium"
                                    >
                                      {children}
                                    </button>
                                  );
                                }
                                return <a href={href} target="_blank" rel="noreferrer">{children}</a>;
                              },
                              p: ({ children }) => <p className="mb-1 last:mb-0 whitespace-pre-wrap break-words">{children}</p>
                            }}
                          >
                            {contentToRender.replace(/@([A-Za-z0-9_]{3,30}|everyone)/gi, "[**@$1**](mention://$1)")}
                          </ReactMarkdown>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Participants Sidebar */}
              {showParticipants && selected.type === "TEXT" && (
                <div className="w-64 shrink-0 border-l border-separator bg-surface flex flex-col absolute right-0 inset-y-0 shadow-[-4px_0_15px_rgba(0,0,0,0.05)] md:relative md:shadow-none z-10">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-separator">
                    <span className="text-sm font-semibold">Participants</span>
                    <button type="button" onClick={() => setShowParticipants(false)} className="md:hidden text-faint hover:text-foreground"><X className="h-4 w-4" /></button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-2 no-scrollbar">
                    {inChannel
                      .sort((a, b) => {
                        const aOnline = online.includes(a.id);
                        const bOnline = online.includes(b.id);
                        if (aOnline === bOnline) return a.displayName.localeCompare(b.displayName);
                        return aOnline ? -1 : 1;
                      })
                      .map((m) => {
                        const isOnline = online.includes(m.id);
                        return (
                          <div key={m.id} className={cn("flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors group hover:bg-hover", !isOnline && "opacity-80")}>
                            <div className="relative">
                              <Avatar name={m.displayName} size={28} />
                              <span className={cn("absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-surface", isOnline ? "bg-success" : "bg-muted")}></span>
                            </div>
                            <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{m.displayName}</p><p className="truncate text-xs text-muted">@{m.devTag}</p></div>
                            {selected.adminId === me?.id && selected.adminId !== m.id && (
                              <button 
                                type="button" 
                                onClick={() => removeChannelMember(selected.id, m.id).then(() => qc.invalidateQueries({ queryKey: ["channelMembers", selected.id] }))} 
                                className="cursor-pointer text-muted hover:text-danger opacity-0 group-hover:opacity-100 transition"
                                aria-label="Remove member"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Typing indicator */}
            <div className="h-5 px-4 text-xs text-muted shrink-0">
              {typingNames.length > 0 && (
                <span className="flex items-center gap-1.5">
                  <TypingDots />
                  {typingNames.join(", ")} {typingNames.length === 1 ? "is" : "are"} typing…
                </span>
              )}
            </div>

            <ChatEditorInput 
              selected={selected}
              inChannel={inChannel}
              onSend={(content) => send.mutate(content)}
            />
          </>
        )}
      </div>
    </div>
  );
}

function ChatEditorInput({ selected, inChannel, onSend }: { selected: Channel, inChannel: ChannelMember[], onSend: (text: string) => void }) {
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [isEmpty, setIsEmpty] = useState(true);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sendTyping = (typing: boolean) => {
    if (selected?.id) publish(`/app/channel.${selected.id}.typing`, { typing });
  };

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({ 
        openOnClick: false,
        protocols: ["http", "https", "mailto", "tel", "projects", "kanban", "mention"]
      }),
      Markdown,
      Placeholder.configure({ placeholder: selected.type === "DM" ? `Message ${selected.name}` : `Message #${selected.name}` }),
    ],
    immediatelyRender: false,
    content: "",
    onUpdate: ({ editor }) => {
      setIsEmpty(!editor.getText().trim());
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      sendTyping(true);
      typingTimerRef.current = setTimeout(() => sendTyping(false), 2500);

      const { from } = editor.state.selection;
      const textBefore = editor.state.doc.textBetween(Math.max(0, from - 30), from, " ");
      const match = /(?:^|\s)@([a-zA-Z0-9_]*)$/.exec(textBefore);
      if (match && selected?.type === "TEXT") {
        setMentionQuery(match[1]);
      } else {
        setMentionQuery(null);
      }
    },
    editorProps: {
      attributes: {
        class: "focus:outline-none min-h-[40px] px-3 py-2 pr-12 pb-3 text-[15px] leading-relaxed [&_p.is-editor-empty:first-child::before]:text-faint [&_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_p.is-editor-empty:first-child::before]:pointer-events-none [&_p.is-editor-empty:first-child::before]:float-left [&_p.is-editor-empty:first-child::before]:h-0 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-1 [&_strong]:font-bold [&_em]:italic [&_s]:line-through [&_u]:underline [&_a]:text-accent [&_a:hover]:underline",
      }
    }
  });

  const handleSend = () => {
    if (!editor) return;
    const text = editor.getText().trim();
    if (!text) return;
    const md = (editor.storage as any).markdown.getMarkdown();
    onSend(md);
    editor.commands.clearContent();
    setIsEmpty(true);
    sendTyping(false);
  };

  const allCandidates = [{ id: "everyone", displayName: "Everyone", devTag: "everyone", avatarUrl: null }, ...inChannel];
  const mentionCandidates = mentionQuery !== null ? allCandidates.filter((m) => m.displayName.toLowerCase().includes(mentionQuery.toLowerCase()) || m.devTag.toLowerCase().includes(mentionQuery.toLowerCase())) : [];

  if (!editor) return null;

  const ToolbarButton = ({ onClick, isActive, children }: { onClick: () => void, isActive: boolean, children: React.ReactNode }) => (
    <button
      type="button"
      onClick={onClick}
      className={cn("p-1.5 rounded transition", isActive ? "bg-accent/20 text-accent" : "text-muted hover:text-foreground hover:bg-hover")}
    >
      {children}
    </button>
  );

  return (
    <div className="shrink-0 border-t border-separator p-3 relative max-h-[50%] flex flex-col">
      {mentionQuery !== null && mentionCandidates.length > 0 && (
        <div className="absolute bottom-full left-3 mb-2 w-64 overflow-hidden rounded-xl border border-separator bg-surface shadow-[var(--shadow-pop)] z-20">
          <div className="max-h-48 overflow-y-auto p-1 no-scrollbar">
            {mentionCandidates.map((c) => (
              <button
                key={c.id}
                type="button"
                className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-hover"
                onClick={() => {
                  const { from } = editor.state.selection;
                  const textBefore = editor.state.doc.textBetween(Math.max(0, from - 30), from, " ");
                  const match = /(?:^|\s)(@[a-zA-Z0-9_]*)$/.exec(textBefore);
                  if (match) {
                    const start = from - match[1].length;
                    editor.view.dispatch(editor.view.state.tr.insertText(`@${c.devTag} `, start, from));
                    editor.commands.focus();
                    setMentionQuery(null);
                  }
                }}
              >
                {c.id === "everyone" ? <AtSign className="h-5 w-5 text-accent" /> : <Avatar name={c.displayName} size={20} />}
                <span className="font-medium truncate">{c.displayName}</span>
                <span className="text-xs text-muted truncate">@{c.devTag}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      
      <div className="flex flex-col rounded-xl border border-separator bg-surface focus-within:border-accent shadow-sm overflow-hidden flex-1 min-h-0 relative">
        <div className="flex items-center gap-1 border-b border-separator/50 p-1 bg-sidebar/50 flex-wrap shrink-0">
          <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive("bold")}><Bold className="h-4 w-4" /></ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive("italic")}><Italic className="h-4 w-4" /></ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} isActive={editor.isActive("underline")}><UnderlineIcon className="h-4 w-4" /></ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} isActive={editor.isActive("strike")}><Strikethrough className="h-4 w-4" /></ToolbarButton>
          <div className="w-px h-4 bg-separator/50 mx-1"></div>
          <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} isActive={editor.isActive("bulletList")}><List className="h-4 w-4" /></ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} isActive={editor.isActive("orderedList")}><ListOrdered className="h-4 w-4" /></ToolbarButton>
          <div className="w-px h-4 bg-separator/50 mx-1"></div>
          <ToolbarButton onClick={() => {
            const url = window.prompt("URL:");
            if (url) editor.chain().focus().setLink({ href: url }).run();
          }} isActive={editor.isActive("link")}><LinkIcon className="h-4 w-4" /></ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().unsetAllMarks().run()} isActive={false}><Eraser className="h-4 w-4" /></ToolbarButton>
        </div>
        
        <div 
          className="flex-1 overflow-y-auto min-h-0"
          onKeyDownCapture={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              e.stopPropagation();
              handleSend();
            } else if (e.key === "Enter" && !e.shiftKey && mentionQuery !== null && mentionCandidates.length > 0) {
              e.preventDefault();
              e.stopPropagation();
              const { from } = editor.state.selection;
              const textBefore = editor.state.doc.textBetween(Math.max(0, from - 30), from, " ");
              const match = /(?:^|\s)(@[a-zA-Z0-9_]*)$/.exec(textBefore);
              if (match) {
                const start = from - match[1].length;
                editor.view.dispatch(editor.view.state.tr.insertText(`@${mentionCandidates[0].devTag} `, start, from));
                editor.commands.focus();
                setMentionQuery(null);
              }
            }
          }}
        >
          <EditorContent editor={editor} />
        </div>
        
        <div className="absolute bottom-2 right-2 z-10 flex">
          <button 
            type="button" 
            onClick={handleSend} 
            disabled={isEmpty} 
            aria-label="Send" 
            className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-accent text-accent-foreground transition hover:brightness-110 disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function TypingDots() {
  return (
    <span className="flex gap-1">
      {[0, 1, 2].map((d) => (
        <span key={d} className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted" style={{ animationDelay: `${d * 0.15}s` }} />
      ))}
    </span>
  );
}

function ChannelRow({ channel, active, onClick }: { channel: Channel; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={cn("flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors", active ? "bg-accent text-accent-foreground" : "text-foreground/80 hover:bg-hover")}>
      {channel.type === "DM" ? <Avatar name={channel.name} size={18} /> : (
        channel.imageUrl ? <img src={channel.imageUrl} alt="" className="h-4 w-4 rounded opacity-80 object-cover shrink-0" /> : <Hash className="h-4 w-4 opacity-70 shrink-0" />
      )}
      <span className={cn("flex-1 truncate text-left", channel.unread > 0 && !active && "font-semibold")}>{channel.name}</span>
      {channel.unread > 0 && !active && (
        <span className="grid h-[18px] min-w-[18px] place-items-center rounded-full bg-danger px-1 text-[10px] font-semibold tabular-nums text-white">
          {channel.unread > 99 ? "99+" : channel.unread}
        </span>
      )}
    </button>
  );
}

function DmSearch({ ws, onClose, onPick }: { ws: string; onClose: () => void; onPick: (id: string) => void }) {
  const [q, setQ] = useState("");
  const results = useQuery({ queryKey: ["memberSearch", ws, q], queryFn: () => searchMembers(ws, q), enabled: !!ws });
  const members = results.data ?? [];
  return (
    <div className="absolute inset-x-0 top-0 z-20 border-b border-separator bg-surface p-3 shadow-[var(--shadow-card)]">
      <div className="mb-2 flex items-center gap-2">
        <Search className="h-4 w-4 text-faint" />
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search members in this project…" className="flex-1 bg-transparent text-sm outline-none placeholder:text-faint" />
        <button type="button" aria-label="Close" onClick={onClose} className="cursor-pointer text-faint hover:text-foreground"><X className="h-4 w-4" /></button>
      </div>
      <div className="max-h-56 overflow-y-auto no-scrollbar">
        {members.length === 0 && <p className="px-2 py-3 text-center text-sm text-muted">No members found.</p>}
        {members.map((m) => (
          <button key={m.id} type="button" onClick={() => onPick(m.id)} className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-hover">
            <Avatar name={m.displayName} size={28} />
            <div className="min-w-0"><p className="truncate text-sm font-medium">{m.displayName}</p><p className="truncate text-xs text-muted">@{m.devTag}</p></div>
          </button>
        ))}
      </div>
    </div>
  );
}

function AddPeople({ ws, channelId, onClose }: { ws: string; channelId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const membersQuery = useQuery({ queryKey: ["channelMembers", channelId], queryFn: () => listChannelMembers(channelId), enabled: !!channelId });
  const inChannel = membersQuery.data ?? [];
  const inIds = new Set(inChannel.map((m) => m.id));
  const search = useQuery({ queryKey: ["memberSearch", ws, q], queryFn: () => searchMembers(ws, q), enabled: !!ws });
  const candidates = (search.data ?? []).filter((m) => !inIds.has(m.id));
  const add = useMutation({
    mutationFn: (userId: string) => addChannelMember(channelId, userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["channelMembers", channelId] }),
  });

  return (
    <div className="absolute inset-x-0 top-0 z-20 border-b border-separator bg-surface p-3 shadow-[var(--shadow-card)]">
      <div className="mb-2 flex items-center gap-2">
        <UserPlus className="h-4 w-4 text-faint" />
        <span className="text-sm font-semibold">Add people to the channel</span>
        <span className="text-xs text-muted">· {inChannel.length} member{inChannel.length === 1 ? "" : "s"}</span>
        <button type="button" aria-label="Close" onClick={onClose} className="ml-auto cursor-pointer text-faint hover:text-foreground"><X className="h-4 w-4" /></button>
      </div>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search project members…" className="mb-2 w-full rounded-lg border border-separator bg-surface px-3 py-1.5 text-sm outline-none focus:border-accent" />
      <div className="max-h-56 overflow-y-auto no-scrollbar">
        {candidates.length === 0 && <p className="px-2 py-3 text-center text-sm text-muted">Everyone matching is already in.</p>}
        {candidates.map((m) => (
          <div key={m.id} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5">
            <Avatar name={m.displayName} size={28} />
            <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{m.displayName}</p><p className="truncate text-xs text-muted">@{m.devTag}</p></div>
            <button type="button" onClick={() => add.mutate(m.id)} disabled={add.isPending} className="cursor-pointer rounded-md bg-accent px-2.5 py-1 text-xs font-medium text-accent-foreground transition hover:brightness-110 disabled:opacity-50">Add</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function EditChannelDialog({ ws, channel, onClose }: { ws: string; channel: Channel; onClose: () => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState(channel.name);
  const [desc, setDesc] = useState(channel.description || "");
  const [img, setImg] = useState(channel.imageUrl || "");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const update = useMutation({
    mutationFn: () => updateChannel(ws, channel.id, { name, description: desc, imageUrl: img }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["channels", ws] }); onClose(); }
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploading(true);
      const uploaded = await uploadFile(ws, file, true, true);
      setImg(fileUrl(uploaded.id));
    } catch (err) {
      console.error("Failed to upload image", err);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="absolute inset-x-0 top-0 z-20 border-b border-separator bg-surface p-4 shadow-[var(--shadow-card)]">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm font-semibold flex items-center gap-2"><Settings className="w-4 h-4" /> Edit Channel</span>
        <button type="button" aria-label="Close" onClick={onClose} className="cursor-pointer text-faint hover:text-foreground"><X className="h-4 w-4" /></button>
      </div>
      <div className="space-y-4 max-w-md">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted">Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-lg border border-separator bg-transparent px-3 py-1.5 text-sm outline-none focus:border-accent" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted">Description</label>
          <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="What is this channel about?" className="w-full rounded-lg border border-separator bg-transparent px-3 py-1.5 text-sm outline-none focus:border-accent" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted">Channel Image</label>
          <div className="flex items-center gap-3">
            {img ? (
              <img src={img} alt="Channel avatar" className="w-10 h-10 rounded-lg object-cover bg-muted" />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-faint">
                <ImageIcon className="w-5 h-5" />
              </div>
            )}
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
            <button 
              type="button" 
              onClick={() => fileInputRef.current?.click()} 
              disabled={isUploading}
              className="px-3 py-1.5 text-xs font-medium border border-separator rounded-lg hover:bg-hover transition disabled:opacity-50"
            >
              {isUploading ? "Uploading..." : "Upload Image"}
            </button>
            {img && (
              <button type="button" onClick={() => setImg("")} className="text-xs text-danger hover:underline">Remove</button>
            )}
          </div>
        </div>
        <button type="button" onClick={() => update.mutate()} disabled={update.isPending || !name.trim() || isUploading} className="w-full cursor-pointer rounded-lg bg-accent py-2 text-sm font-medium text-accent-foreground transition hover:brightness-110 disabled:opacity-50">Save Changes</button>
      </div>
    </div>
  );
}
