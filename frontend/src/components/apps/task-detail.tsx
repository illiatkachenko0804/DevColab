import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { X, CalendarClock, MessageSquare, Trash2, CheckSquare, Bug, Bookmark, Zap, ArrowUp, ArrowRight, ArrowDown, AlertCircle, Bold, Italic, Underline as UnderlineIcon, Strikethrough, List, ListOrdered, Link as LinkIcon, Eraser } from "lucide-react";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { Markdown } from "tiptap-markdown";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import {
  updateTask as apiUpdateTask,
  deleteTask as apiDeleteTask,
  getBoard,
  createTask as apiCreateTask,
  type BoardTask,
  type BoardColumn
} from "@/lib/board";
import { getComments, createComment, deleteComment } from "@/lib/comments";
import { attachLabelToTask, detachLabelFromTask } from "@/lib/labels";
import { listMembers } from "@/lib/members";
import { LabelPicker } from "./label-picker";
import { Copy } from "lucide-react";
import { useMemo } from "react";
import { useOS } from "@/stores/os";

export function TypeIcon({ type, className }: { type: BoardTask["type"]; className?: string }) {
  switch (type) {
    case "BUG": return <Bug className={cn("h-4 w-4 text-danger", className)} />;
    case "STORY": return <Bookmark className={cn("h-4 w-4 text-success", className)} />;
    case "EPIC": return <Zap className={cn("h-4 w-4 text-purple-500", className)} />;
    case "TASK":
    default:
      return <CheckSquare className={cn("h-4 w-4 text-blue-500", className)} />;
  }
}

export function PriorityIcon({ priority, className }: { priority: BoardTask["priority"]; className?: string }) {
  switch (priority) {
    case "URGENT": return <AlertCircle className={cn("h-4 w-4 text-danger", className)} />;
    case "HIGH": return <ArrowUp className={cn("h-4 w-4 text-orange-500", className)} />;
    case "MEDIUM": return <ArrowRight className={cn("h-4 w-4 text-yellow-500", className)} />;
    case "LOW":
    default:
      return <ArrowDown className={cn("h-4 w-4 text-blue-400", className)} />;
  }
}

function RichTextEditor({ 
  initialValue, 
  onSave, 
  onCancel, 
  placeholder = "Add a description...",
  minHeight = "100px",
  members = [] 
}: { 
  initialValue: string; 
  onSave: (val: string) => void; 
  onCancel?: () => void; 
  placeholder?: string;
  minHeight?: string;
  members?: { id: string; displayName: string; devTag: string; avatarUrl: string | null }[];
}) {
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({ 
        openOnClick: false,
        protocols: ["http", "https", "mailto", "tel", "projects", "kanban", "mention"]
      }),
      Markdown,
      Placeholder.configure({ placeholder }),
    ],
    content: initialValue,
    onUpdate: ({ editor }) => {
      const { from } = editor.state.selection;
      const textBefore = editor.state.doc.textBetween(Math.max(0, from - 30), from, " ");
      const match = /(?:^|\s)@([a-zA-Z0-9_]*)$/.exec(textBefore);
      if (match) {
        setMentionQuery(match[1]);
      } else {
        setMentionQuery(null);
      }
    },
    editorProps: {
      attributes: {
        class: `focus:outline-none p-3 text-[15px] leading-relaxed [&_p.is-editor-empty:first-child::before]:text-faint [&_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_p.is-editor-empty:first-child::before]:pointer-events-none [&_p.is-editor-empty:first-child::before]:float-left [&_p.is-editor-empty:first-child::before]:h-0 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-1 [&_strong]:font-bold [&_em]:italic [&_s]:line-through [&_u]:underline [&_a]:text-accent [&_a:hover]:underline`,
        style: `min-height: ${minHeight};`
      }
    }
  });

  if (!editor) return null;

  const mentionCandidates = mentionQuery !== null 
    ? members.filter((m) => m.displayName.toLowerCase().includes(mentionQuery.toLowerCase()) || m.devTag.toLowerCase().includes(mentionQuery.toLowerCase())) 
    : [];

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
    <div className="flex flex-col rounded-xl border border-separator focus-within:border-accent bg-surface shadow-sm overflow-visible min-h-0 relative transition">
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
                <Avatar name={c.displayName} url={c.avatarUrl} size={24} />
                <span className="font-medium truncate">{c.displayName}</span>
                <span className="text-xs text-muted truncate">@{c.devTag}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <EditorContent 
        editor={editor} 
        className="flex-1 overflow-y-auto cursor-text bg-surface/50" 
        onKeyDownCapture={(e) => {
          if (e.key === "Enter" && !e.shiftKey && mentionQuery !== null && mentionCandidates.length > 0) {
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
      />
      <div className="flex items-center justify-end gap-2 p-2 border-t border-separator/50 bg-surface">
        {onCancel && <button onClick={onCancel} className="px-3 py-1.5 text-sm font-medium text-muted hover:text-foreground">Cancel</button>}
        <button onClick={() => {
          const md = (editor.storage as any).markdown.getMarkdown();
          onSave(md);
          if (!onCancel) editor.commands.setContent(""); // Reset if it's a persistent input
        }} className="rounded bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground transition hover:brightness-110">Save</button>
      </div>
    </div>
  );
}

export function TaskDetail({ ws, task, onClose, onChanged }: { ws: string; task: BoardTask; onClose: () => void; onChanged: () => void }) {
  const qc = useQueryClient();
  const boardQuery = useQuery({ queryKey: ["board", ws], queryFn: () => getBoard(ws), enabled: !!ws });
  
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [assigneeId, setAssigneeId] = useState(task.assignee?.id ?? "");
  const [priority, setPriority] = useState(task.priority);
  const [type, setType] = useState(task.type);
  const [due, setDue] = useState(task.due ?? "");
  const [newComment, setNewComment] = useState("");
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [isCopied, setIsCopied] = useState(false);

  const membersQuery = useQuery({ queryKey: ["members", ws], queryFn: () => listMembers(ws), enabled: !!ws });
  const commentsQuery = useQuery({ queryKey: ["comments", task.id], queryFn: () => getComments(task.id) });

  const members = membersQuery.data ?? [];
  const comments = commentsQuery.data ?? [];

  const save = useMutation({
    mutationFn: () => apiUpdateTask(task.id, {
      title: title.trim(),
      description: description.trim(),
      assigneeId,
      due,
      priority,
      type
    }),
    onSuccess: () => { onChanged(); },
  });

  const saveDescription = useMutation({
    mutationFn: (newDesc: string) => apiUpdateTask(task.id, { description: newDesc.trim() }),
    onSuccess: () => onChanged(),
  });

  const remove = useMutation({
    mutationFn: () => apiDeleteTask(task.id),
    onSuccess: () => { onChanged(); onClose(); },
  });

  const addComment = useMutation({
    mutationFn: () => createComment(task.id, newComment.trim()),
    onSuccess: () => {
      setNewComment("");
      qc.invalidateQueries({ queryKey: ["comments", task.id] });
      onChanged();
    }
  });

  const removeComment = useMutation({
    mutationFn: (id: string) => deleteComment(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["comments", task.id] });
      onChanged();
    }
  });

  const toggleLabel = useMutation({
    mutationFn: async (labelId: string) => {
      if (task.labels.some(l => l.id === labelId)) {
        await detachLabelFromTask(task.id, labelId);
      } else {
        await attachLabelToTask(task.id, labelId);
      }
    },
    onSuccess: () => onChanged()
  });

  const createSubtask = useMutation({
    mutationFn: () => apiCreateTask(task.columnId, { title: newSubtaskTitle.trim(), parentId: task.id }),
    onSuccess: () => {
      setNewSubtaskTitle("");
      qc.invalidateQueries({ queryKey: ["board", ws] });
      onChanged();
    }
  });

  const subtasks = useMemo(() => {
    if (!boardQuery.data) return [];
    return boardQuery.data.columns.flatMap((c: BoardColumn) => c.tasks).filter((t: BoardTask) => t.parentId === task.id);
  }, [boardQuery.data, task.id]);

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/40 p-4 sm:p-6 backdrop-blur-sm" onClick={onClose}>
      <div className="glass-strong flex w-full max-w-4xl max-h-full flex-col overflow-hidden rounded-2xl border border-separator shadow-[var(--shadow-pop)]" onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-separator px-6">
          <div className="flex items-center gap-2 text-muted">
            <TypeIcon type={type} />
            <span className="text-sm font-semibold tracking-wide text-foreground/80">{task.taskKey}</span>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => remove.mutate()} disabled={remove.isPending} className="cursor-pointer rounded p-1.5 text-faint hover:bg-danger/10 hover:text-danger transition"><Trash2 className="h-4 w-4" /></button>
            <button type="button" aria-label="Close" onClick={onClose} className="cursor-pointer rounded p-1.5 text-faint hover:bg-hover hover:text-foreground transition"><X className="h-5 w-5" /></button>
          </div>
        </div>

        {/* Content */}
        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          {/* Main Left Panel */}
          <div className="flex-1 overflow-y-auto border-r border-separator p-6 no-scrollbar">
            <div className="group relative mb-4 rounded-lg border border-transparent hover:border-dashed hover:border-separator transition-all -ml-2 p-2">
              <input 
                value={title} 
                onChange={(e) => setTitle(e.target.value)} 
                onBlur={() => save.mutate()}
                className="w-full bg-transparent text-2xl font-semibold leading-tight text-foreground outline-none placeholder:text-faint" 
                placeholder="Task title"
              />
              <button 
                onClick={() => {
                  const html = new Blob([`<a href="projects://task/${task.id}">${task.taskKey}</a>`], { type: 'text/html' });
                  const text = new Blob([`[${task.taskKey}](projects://task/${task.id})`], { type: 'text/plain' });
                  navigator.clipboard.write([new ClipboardItem({ 'text/html': html, 'text/plain': text })]).then(() => {
                    setIsCopied(true);
                    setTimeout(() => setIsCopied(false), 2000);
                  });
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md bg-surface border border-separator text-muted hover:text-foreground hover:border-accent shadow-sm flex items-center gap-1.5 text-xs font-medium cursor-pointer"
                title="Copy Link to Task"
              >
                <Copy className="h-3.5 w-3.5" />
                {isCopied ? "Copied!" : "Copy Link"}
              </button>
            </div>

            <div className="mb-8">
              <label className="mb-2 block text-sm font-medium text-foreground">Description</label>
              {isEditingDescription ? (
                <RichTextEditor
                  initialValue={description}
                  onSave={(val) => {
                    setDescription(val);
                    setIsEditingDescription(false);
                    saveDescription.mutate(val);
                  }}
                  onCancel={() => setIsEditingDescription(false)}
                  members={membersQuery.data}
                />
              ) : (
                <div 
                  onClick={() => setIsEditingDescription(true)}
                  className={cn(
                    "w-full min-h-[100px] cursor-text rounded-xl border border-transparent hover:border-separator/50 bg-transparent hover:bg-surface/30 p-3 text-sm transition",
                    !description && "text-muted italic",
                    "text-[15px] leading-relaxed text-foreground/90 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-1 [&_strong]:font-bold [&_em]:italic [&_del]:line-through [&_a]:text-accent [&_a:hover]:underline [&_pre]:bg-surface [&_pre]:p-2 [&_pre]:rounded [&_code]:bg-surface [&_code]:px-1 [&_code]:rounded"
                  )}
                >
                  {description ? (
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        a: ({ href, children }) => <a href={href} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>{children}</a>,
                        p: ({ children }) => <p className="mb-1 last:mb-0 whitespace-pre-wrap break-words">{children}</p>
                      }}
                    >
                      {description}
                    </ReactMarkdown>
                  ) : (
                    "Add a description..."
                  )}
                </div>
              )}
            </div>

            <div className="mb-8">
              <h3 className="mb-4 text-sm font-medium text-foreground">Subtasks</h3>
              <div className="flex flex-col gap-2 mb-3">
                {subtasks.map((st: BoardTask) => (
                  <div key={st.id} className="flex items-center gap-3 rounded-xl border border-separator bg-surface p-2.5 transition hover:border-accent">
                    <TypeIcon type={st.type} className="h-3.5 w-3.5" />
                    <span className="w-16 text-xs font-semibold text-muted">{st.taskKey}</span>
                    <span className="flex-1 truncate text-sm font-medium text-foreground">{st.title}</span>
                    {st.assignee && <Avatar name={st.assignee.displayName} url={st.assignee.avatarUrl} size={20} />}
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <input 
                  value={newSubtaskTitle}
                  onChange={(e) => setNewSubtaskTitle(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && newSubtaskTitle.trim()) createSubtask.mutate(); }}
                  placeholder="Create subtask..."
                  className="flex-1 rounded-lg border border-separator bg-surface px-3 py-1.5 text-sm outline-none transition focus:border-accent"
                />
              </div>
            </div>

            <div className="mb-6">
              <h3 className="mb-4 text-sm font-medium text-foreground">Comments</h3>
              
              <div className="flex gap-3 mb-8">
                <Avatar name="Me" size={32} />
                <div className="flex-1">
                  <RichTextEditor
                    initialValue=""
                    placeholder="Add a comment..."
                    minHeight="60px"
                    onSave={(val) => {
                      if (val.trim()) {
                        setNewComment(val);
                        // We need to pass the value directly to mutation since state update is async
                        createComment(task.id, val.trim()).then(() => {
                          qc.invalidateQueries({ queryKey: ["comments", task.id] });
                          onChanged();
                        });
                      }
                    }}
                    members={membersQuery.data}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-6">
                {comments.map((c) => {
                  const contentToRender = c.content.replace(/@([A-Za-z0-9_]{3,30}|everyone)/gi, "[**@$1**](mention://$1)");
                  return (
                    <div key={c.id} className="flex gap-3">
                      <Avatar name={c.author?.displayName ?? "Unknown"} url={c.author?.avatarUrl} size={32} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-foreground">{c.author?.displayName ?? "Unknown"}</span>
                          <span className="text-xs text-muted">{new Date(c.createdAt).toLocaleString()}</span>
                        </div>
                        <div className="text-[14px] leading-relaxed text-foreground/90 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-1 [&_strong]:font-bold [&_em]:italic [&_del]:line-through [&_a]:text-accent [&_a:hover]:underline [&_pre]:bg-surface [&_pre]:p-2 [&_pre]:rounded [&_code]:bg-surface [&_code]:px-1 [&_code]:rounded">
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
                                return <a href={href} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>{children}</a>;
                              },
                              p: ({ children }) => <p className="mb-1 last:mb-0 whitespace-pre-wrap break-words">{children}</p>
                            }}
                          >
                            {contentToRender}
                          </ReactMarkdown>
                        </div>
                        <button onClick={() => removeComment.mutate(c.id)} className="mt-2 text-[11px] font-medium text-faint hover:text-danger">Delete</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Sidebar Right Panel */}
          <div className="w-full shrink-0 overflow-y-auto bg-surface/30 p-6 md:w-72 no-scrollbar">
            <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-muted">Details</h3>
            
            <div className="flex flex-col gap-4">
              <div>
                <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted">Labels</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {task.labels.map(l => (
                    <span key={l.id} className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium" style={{ backgroundColor: `${l.color}20`, color: l.color }}>
                      {l.name}
                    </span>
                  ))}
                </div>
                <LabelPicker ws={ws} selectedLabelIds={task.labels.map(l => l.id)} onToggleLabel={(id) => toggleLabel.mutate(id)} />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted">Assignee</label>
                <select value={assigneeId} onChange={(e) => { setAssigneeId(e.target.value); setTimeout(() => save.mutate(), 0); }} className="w-full cursor-pointer rounded-lg border border-separator bg-surface px-3 py-1.5 text-sm font-medium outline-none hover:border-accent">
                  <option value="">Unassigned</option>
                  {members.map((m) => <option key={m.id} value={m.id}>{m.displayName}</option>)}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted">Type</label>
                <select value={type} onChange={(e) => { setType(e.target.value as any); setTimeout(() => save.mutate(), 0); }} className="w-full cursor-pointer rounded-lg border border-separator bg-surface px-3 py-1.5 text-sm font-medium outline-none hover:border-accent">
                  <option value="TASK">Task</option>
                  <option value="BUG">Bug</option>
                  <option value="STORY">Story</option>
                  <option value="EPIC">Epic</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted">Priority</label>
                <select value={priority} onChange={(e) => { setPriority(e.target.value as any); setTimeout(() => save.mutate(), 0); }} className="w-full cursor-pointer rounded-lg border border-separator bg-surface px-3 py-1.5 text-sm font-medium outline-none hover:border-accent">
                  <option value="URGENT">Urgent</option>
                  <option value="HIGH">High</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="LOW">Low</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted">Due date</label>
                <input type="date" value={due} onChange={(e) => { setDue(e.target.value); setTimeout(() => save.mutate(), 0); }} className="w-full cursor-pointer rounded-lg border border-separator bg-surface px-3 py-1.5 text-sm font-medium outline-none hover:border-accent" />
              </div>
            </div>

            <div className="mt-8 border-t border-separator pt-6">
              <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted">Reporter</label>
              <div className="flex items-center gap-2">
                <Avatar name={task.reporter?.displayName ?? "Unknown"} url={task.reporter?.avatarUrl} size={24} />
                <span className="text-sm text-foreground">{task.reporter?.displayName ?? "Unknown"}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
