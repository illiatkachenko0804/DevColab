import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2, MessageSquare, Star, Edit3, Save, X, Folder, Hash, Link as LinkIcon, Check } from "lucide-react";
import ReactMarkdown from "react-markdown";

import { Avatar } from "@/components/ui/avatar";
import { CodeBlock } from "@/components/ui/code-block";
import { CodeEditor } from "./code-editor";
import { LanguagePicker } from "./language-picker";
import { cn, relativeTime } from "@/lib/utils";
import {
  getSnippet,
  deleteSnippet,
  addSnippetComment,
  toggleStarSnippet,
  updateSnippet,
  Snippet
} from "@/lib/snippets";
import { usePermissions } from "@/lib/workspaces";

interface DetailViewProps {
  id: string;
  ws: string;
  meId: string;
  onDeleted: () => void;
  onCommented: () => void;
  onForked: (newId: string) => void;
}

export function DetailView({ id, ws, meId, onDeleted, onCommented, onForked }: DetailViewProps) {
  const qc = useQueryClient();
  const [comment, setComment] = useState("");
  const [editing, setEditing] = useState(false);
  
  // Edit State
  const [editTitle, setEditTitle] = useState("");
  const [editLang, setEditLang] = useState("");
  const [editCode, setEditCode] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [copiedLink, setCopiedLink] = useState(false);

  const permissions = usePermissions();
  const canComment = permissions.comment === true;

  const detailQuery = useQuery({ queryKey: ["snippet", id], queryFn: () => getSnippet(id) });
  const detail = detailQuery.data;

  useEffect(() => {
    if (detailQuery.isError) {
      onDeleted();
    }
  }, [detailQuery.isError, onDeleted]);

  useEffect(() => {
    if (detail && !editing) {
      setEditTitle(detail.snippet.title);
      setEditLang(detail.snippet.language);
      setEditCode(detail.snippet.code);
      setEditDesc(detail.snippet.description || "");
    }
  }, [detail, editing]);

  const addComment = useMutation({
    mutationFn: (content: string) => addSnippetComment(id, content),
    onSuccess: () => { setComment(""); qc.invalidateQueries({ queryKey: ["snippet", id] }); onCommented(); },
  });

  const remove = useMutation({ mutationFn: () => deleteSnippet(id), onSuccess: onDeleted });
  
  const toggleStar = useMutation({
    mutationFn: () => toggleStarSnippet(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["snippet", id] }); qc.invalidateQueries({ queryKey: ["snippets", ws] }); }
  });

  const update = useMutation({
    mutationFn: () => updateSnippet(id, {
      title: editTitle,
      language: editLang,
      code: editCode,
      description: editDesc
    }),
    onSuccess: () => {
      setEditing(false);
      qc.invalidateQueries({ queryKey: ["snippet", id] });
      qc.invalidateQueries({ queryKey: ["snippets", ws] });
    }
  });

  if (!detail) return <div className="flex h-full items-center justify-center text-sm text-muted">Loading…</div>;
  const s = detail.snippet;
  const canEdit = s.author?.id === meId;
  const canDelete = s.author?.id === meId;

  if (editing) {
    return (
      <div className="flex h-full flex-col overflow-y-auto no-scrollbar bg-background">
        <div className="flex items-center justify-between border-b border-separator p-4 bg-surface/50">
          <div className="flex flex-1 gap-4 items-center">
            <input 
              value={editTitle} 
              onChange={e => setEditTitle(e.target.value)} 
              className="flex-1 bg-transparent text-xl font-semibold outline-none border-b border-transparent focus:border-accent"
              placeholder="Snippet Title"
            />
            <LanguagePicker value={editLang} onChange={setEditLang} />
          </div>
          <div className="flex items-center gap-2 ml-4">
            <button onClick={() => setEditing(false)} className="px-3 py-1.5 text-sm border border-separator rounded-md hover:bg-hover transition-colors">Cancel</button>
            <button 
              onClick={() => update.mutate()} 
              disabled={update.isPending || !editTitle.trim() || !editCode.trim()}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-accent text-accent-foreground rounded-md hover:brightness-110 disabled:opacity-50 transition-colors"
            >
              <Save className="h-4 w-4" /> Save
            </button>
          </div>
        </div>

        <div className="flex-1 flex flex-col p-4 gap-4 max-w-5xl w-full mx-auto">
          <textarea 
            value={editDesc} 
            onChange={e => setEditDesc(e.target.value)}
            placeholder="Add a markdown description..."
            className="w-full h-24 bg-surface border border-separator rounded-md p-3 text-sm outline-none focus:border-accent resize-y"
          />
          <div className="flex-1 min-h-[400px]">
            <CodeEditor value={editCode} onChange={setEditCode} language={editLang} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto no-scrollbar">
      <div className="flex items-start justify-between border-b border-separator p-5 sm:p-6 bg-surface/30 flex-col sm:flex-row gap-4">
        <div className="min-w-0 flex-1">
          <div className="group relative flex items-center gap-3 mb-2 pr-24 rounded-lg border border-transparent hover:border-dashed hover:border-separator transition-all -ml-2 p-2">
            <h2 className="text-2xl font-bold tracking-tight bg-transparent">{s.title}</h2>
            {s.pinned && <span className="bg-accent/20 text-accent text-[10px] uppercase font-bold px-2 py-0.5 rounded-full shrink-0">Pinned</span>}
            {s.visibility === "PRIVATE" && <span className="bg-muted text-muted-foreground text-[10px] uppercase font-bold px-2 py-0.5 rounded-full shrink-0">Private</span>}
            <button 
              className={cn("absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md bg-surface border text-xs font-medium cursor-pointer flex items-center gap-1.5", copiedLink ? "border-success text-success" : "border-separator text-muted hover:border-accent hover:text-accent")}
              onClick={(e) => {
                e.stopPropagation();
                const mdLink = `[Snippet](snippets://snippet/${s.id}) ${s.title}`;
                navigator.clipboard.write([
                  new ClipboardItem({
                    "text/plain": new Blob([mdLink], { type: "text/plain" }),
                    "text/html": new Blob([`<a href="snippets://snippet/${s.id}">Snippet</a> ${s.title}`], { type: "text/html" })
                  })
                ]);
                setCopiedLink(true);
                setTimeout(() => setCopiedLink(false), 2000);
              }}
            >
              {copiedLink ? <Check className="h-3 w-3" /> : <LinkIcon className="h-3 w-3" />}
            </button>
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            {s.author && <Avatar name={s.author.displayName} size={24} />}
            <span className="font-medium text-foreground/80">{s.author?.displayName}</span>
            <span>·</span>
            <span>Created {relativeTime(s.createdAt)}</span>
            {s.updatedAt !== s.createdAt && (
              <>
                <span>·</span>
                <span>Edited {relativeTime(s.updatedAt)}</span>
              </>
            )}
            {s.collectionName && (
              <>
                <span>·</span>
                <span className="flex items-center gap-1 text-foreground/70"><Folder className="h-3 w-3" /> {s.collectionName}</span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2 sm:ml-4 shrink-0">
          <button 
            onClick={() => toggleStar.mutate()} 
            className={cn("flex items-center gap-1.5 px-3 py-1.5 text-sm border border-separator rounded-md transition-colors", s.starred ? "bg-yellow-500/10 border-yellow-500/50 text-yellow-500" : "hover:bg-hover")}
          >
            <Star className={cn("h-4 w-4", s.starred && "fill-current")} /> {s.starCount > 0 ? s.starCount : "Star"}
          </button>
          {canEdit && (
            <button 
              onClick={() => setEditing(true)} 
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-separator rounded-md hover:bg-hover transition-colors"
            >
              <Edit3 className="h-4 w-4" /> Edit
            </button>
          )}
          {canDelete && (
            <button 
              onClick={() => remove.mutate()} 
              disabled={remove.isPending} 
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-separator rounded-md text-danger hover:bg-danger/10 transition-colors ml-2"
            >
              <Trash2 className="h-4 w-4" /> Delete
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 p-6 max-w-5xl w-full mx-auto space-y-6">
        {/* Description */}
        {s.description && (
          <div className="prose prose-sm dark:prose-invert max-w-none bg-surface/50 p-4 rounded-lg border border-separator">
            <ReactMarkdown>{s.description}</ReactMarkdown>
          </div>
        )}

        {/* Tags */}
        {s.tags && s.tags.length > 0 && (
          <div className="flex gap-2">
            {s.tags.map(t => (
              <span key={t} className="px-2 py-1 bg-surface border border-separator rounded-md text-xs text-muted-foreground flex items-center">
                <Hash className="h-3 w-3 mr-1 opacity-50" />{t}
              </span>
            ))}
          </div>
        )}

        {/* Code Block */}
        <div className="rounded-xl overflow-hidden border border-separator shadow-sm">
          <div className="bg-surface border-b border-separator px-4 py-2 flex items-center justify-between">
            <span className="text-xs font-mono text-muted-foreground">{s.language}</span>
          </div>
          <CodeBlock code={s.code} lang={s.language} />
        </div>

        {/* Comments Section */}
        <div className="pt-8">
          <h3 className="mb-4 text-lg font-semibold flex items-center gap-2">
            <MessageSquare className="h-5 w-5" /> Comments ({detail.comments.length})
          </h3>
          <div className="space-y-4 mb-6">
            {detail.comments.map((c) => (
              <div key={c.id} className="flex gap-4 p-4 rounded-lg border border-separator bg-surface/30">
                {c.author && <Avatar name={c.author.displayName} size={36} />}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm">{c.author?.displayName}</span>
                    <span className="text-xs text-muted-foreground">{relativeTime(c.createdAt)}</span>
                  </div>
                  <p className="text-sm text-foreground/90 whitespace-pre-wrap">{c.content}</p>
                </div>
              </div>
            ))}
            {detail.comments.length === 0 && <p className="text-sm text-muted-foreground italic">No comments yet. Start the discussion!</p>}
          </div>
          {canComment ? (
            <form onSubmit={(e) => { e.preventDefault(); if (comment.trim()) addComment.mutate(comment.trim()); }} className="flex gap-3 items-start">
              {detail.snippet.author && <Avatar name={detail.snippet.author.displayName} size={36} className="mt-1" />}
              <div className="flex-1 space-y-3">
                <textarea 
                  value={comment} 
                  onChange={(e) => setComment(e.target.value)} 
                  placeholder="Add a comment…" 
                  rows={3}
                  className="w-full rounded-lg border border-separator bg-surface px-4 py-3 text-sm outline-none focus:border-accent resize-y" 
                />
                <div className="flex justify-end">
                  <button 
                    type="submit" 
                    disabled={!comment.trim() || addComment.isPending} 
                    className="rounded-md bg-accent px-5 py-2 text-sm font-semibold text-accent-foreground transition hover:brightness-110 disabled:opacity-50"
                  >
                    Post Comment
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <div className="rounded-lg border border-separator bg-surface/50 p-4 text-sm text-muted italic text-center">
              You do not have permission to comment on snippets.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
