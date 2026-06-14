"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageSquare, Plus, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { CodeBlock } from "@/components/ui/code-block";
import {
  addSnippetComment,
  createSnippet,
  deleteSnippet,
  getSnippet,
  listSnippets,
} from "@/lib/snippets";
import { cn, relativeTime } from "@/lib/utils";
import { useOS } from "@/stores/os";

const LANGS = ["plaintext", "ts", "tsx", "js", "jsx", "css", "json", "html", "bash"];

export function SnippetsApp() {
  const ws = useOS((s) => s.activeWorkspace);
  const me = useOS((s) => s.user);
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const listQuery = useQuery({ queryKey: ["snippets", ws], queryFn: () => listSnippets(ws), enabled: !!ws });
  const snippets = listQuery.data ?? [];

  useEffect(() => {
    if (snippets.length && !snippets.some((s) => s.id === selectedId)) {
      setSelectedId(snippets[0].id);
    }
  }, [snippets, selectedId]);

  return (
    <div className="relative flex min-h-0 flex-1">
      {/* List */}
      <div className="flex w-72 shrink-0 flex-col border-r border-separator bg-sidebar">
        <div className="flex h-12 items-center justify-between border-b border-separator px-4">
          <span className="font-semibold">Snippets</span>
          <button type="button" aria-label="New snippet" onClick={() => setCreating(true)} className="cursor-pointer text-faint hover:text-foreground"><Plus className="h-4 w-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 no-scrollbar">
          {snippets.length === 0 && <p className="px-2 py-6 text-center text-sm text-muted">No snippets yet. Share one with +.</p>}
          {snippets.map((s) => (
            <button key={s.id} type="button" onClick={() => setSelectedId(s.id)} className={cn("mb-1 flex w-full cursor-pointer flex-col gap-1 rounded-lg border px-3 py-2.5 text-left transition-colors", selectedId === s.id ? "border-separator bg-surface" : "border-transparent hover:bg-hover")}>
              <div className="flex items-center gap-2">
                <span className="rounded px-1.5 py-0.5 font-mono text-[10px] uppercase text-white" style={{ background: "var(--app-snippets)" }}>{s.language}</span>
                <span className="truncate text-sm font-medium">{s.title}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted">
                {s.author && <Avatar name={s.author.displayName} size={16} />}
                {s.author?.displayName.split(" ")[0]} · {relativeTime(s.createdAt)}
                {s.commentCount > 0 && <span className="flex items-center gap-0.5"><MessageSquare className="h-3 w-3" />{s.commentCount}</span>}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Detail */}
      <div className="min-w-0 flex-1">
        {selectedId ? <SnippetDetailView key={selectedId} id={selectedId} canDelete={(authorId) => authorId === me?.id} onDeleted={() => { setSelectedId(null); qc.invalidateQueries({ queryKey: ["snippets", ws] }); }} onCommented={() => qc.invalidateQueries({ queryKey: ["snippets", ws] })} /> : (
          <div className="flex h-full items-center justify-center text-sm text-muted">Select or create a snippet.</div>
        )}
      </div>

      {creating && <NewSnippet ws={ws} onClose={() => setCreating(false)} onCreated={(id) => { setCreating(false); qc.invalidateQueries({ queryKey: ["snippets", ws] }); setSelectedId(id); }} />}
    </div>
  );
}

function SnippetDetailView({ id, canDelete, onDeleted, onCommented }: { id: string; canDelete: (authorId: string) => boolean; onDeleted: () => void; onCommented: () => void }) {
  const qc = useQueryClient();
  const [comment, setComment] = useState("");
  const detailQuery = useQuery({ queryKey: ["snippet", id], queryFn: () => getSnippet(id) });
  const detail = detailQuery.data;

  const addComment = useMutation({
    mutationFn: (content: string) => addSnippetComment(id, content),
    onSuccess: () => { setComment(""); qc.invalidateQueries({ queryKey: ["snippet", id] }); onCommented(); },
  });
  const remove = useMutation({ mutationFn: () => deleteSnippet(id), onSuccess: onDeleted });

  if (!detail) return <div className="flex h-full items-center justify-center text-sm text-muted">Loading…</div>;
  const s = detail.snippet;

  return (
    <div className="flex h-full flex-col overflow-y-auto no-scrollbar">
      <div className="flex items-start justify-between border-b border-separator p-5">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold tracking-tight">{s.title}</h2>
          <div className="mt-2 flex items-center gap-2 text-sm text-muted">
            {s.author && <Avatar name={s.author.displayName} size={22} />}
            {s.author?.displayName}
            <span>· {relativeTime(s.createdAt)} ago</span>
          </div>
        </div>
        {s.author && canDelete(s.author.id) && (
          <button type="button" onClick={() => remove.mutate()} disabled={remove.isPending} aria-label="Delete snippet" className="flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-danger transition hover:bg-danger/10"><Trash2 className="h-3.5 w-3.5" /> Delete</button>
        )}
      </div>
      <div className="p-5">
        <CodeBlock code={s.code} lang={s.language} />
      </div>
      <div className="border-t border-separator p-5">
        <h3 className="mb-3 text-sm font-semibold text-muted">Comments · {detail.comments.length}</h3>
        <div className="space-y-4">
          {detail.comments.map((c) => (
            <div key={c.id} className="flex gap-3">
              {c.author && <Avatar name={c.author.displayName} size={30} />}
              <div>
                <p className="text-sm font-semibold">{c.author?.displayName} <span className="ml-1 text-xs font-normal text-faint">{relativeTime(c.createdAt)}</span></p>
                <p className="text-sm text-foreground/85">{c.content}</p>
              </div>
            </div>
          ))}
          {detail.comments.length === 0 && <p className="text-sm text-muted">No comments yet.</p>}
        </div>
        <form onSubmit={(e) => { e.preventDefault(); if (comment.trim()) addComment.mutate(comment.trim()); }} className="mt-4 flex gap-2">
          <input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Add a comment…" aria-label="Add a comment" className="flex-1 rounded-lg border border-separator bg-surface px-3 py-2 text-sm outline-none focus:border-accent" />
          <button type="submit" disabled={!comment.trim() || addComment.isPending} className="cursor-pointer rounded-lg bg-accent px-4 text-sm font-medium text-accent-foreground transition hover:brightness-110 disabled:opacity-50">Send</button>
        </form>
      </div>
    </div>
  );
}

function NewSnippet({ ws, onClose, onCreated }: { ws: string; onClose: () => void; onCreated: (id: string) => void }) {
  const [title, setTitle] = useState("");
  const [language, setLanguage] = useState("ts");
  const [code, setCode] = useState("");
  const create = useMutation({
    mutationFn: () => createSnippet(ws, { title: title.trim(), language, code }),
    onSuccess: (s) => onCreated(s.id),
  });

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/30 p-6" onClick={onClose}>
      <div className="glass-strong flex w-full max-w-lg flex-col rounded-2xl border border-separator p-5 shadow-[var(--shadow-pop)]" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold">New snippet</h2>
          <button type="button" aria-label="Close" onClick={onClose} className="cursor-pointer text-faint hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>
        <div className="mb-3 flex gap-2">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" aria-label="Snippet title" className="h-9 flex-1 rounded-lg border border-separator bg-surface px-3 text-sm outline-none focus:border-accent" />
          <select value={language} onChange={(e) => setLanguage(e.target.value)} aria-label="Language" className="h-9 cursor-pointer rounded-lg border border-separator bg-surface px-2 text-sm outline-none focus:border-accent">
            {LANGS.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
        <textarea value={code} onChange={(e) => setCode(e.target.value)} placeholder="Paste your code…" aria-label="Snippet code" rows={10} className="mb-4 w-full resize-none rounded-lg border border-separator bg-surface p-3 font-mono text-[13px] outline-none focus:border-accent" />
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="cursor-pointer rounded-lg border border-separator px-4 py-2 text-sm transition hover:bg-hover">Cancel</button>
          <button type="button" onClick={() => create.mutate()} disabled={create.isPending || !title.trim() || !code.trim()} className="cursor-pointer rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition hover:brightness-110 disabled:opacity-50">{create.isPending ? "Sharing…" : "Share snippet"}</button>
        </div>
      </div>
    </div>
  );
}
