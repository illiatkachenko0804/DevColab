import { useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { Markdown } from "tiptap-markdown";
import { Avatar } from "@/components/ui/avatar";
import { Bold, Italic, Underline as UnderlineIcon, Strikethrough, List, ListOrdered, Link as LinkIcon, Eraser } from "lucide-react";
import { cn } from "@/lib/utils";

export const ToolbarButton = ({ onClick, isActive, children }: { onClick: () => void, isActive: boolean, children: React.ReactNode }) => (
  <button
    type="button"
    onClick={onClick}
    className={cn("p-1.5 rounded transition", isActive ? "bg-accent/20 text-accent" : "text-muted hover:text-foreground hover:bg-hover")}
  >
    {children}
  </button>
);

export function RichTextEditor({ 
  initialValue, 
  onSave, 
  onCancel, 
  placeholder = "Add a description...",
  minHeight = "100px",
  members = [],
  saveLabel = "Save"
}: { 
  initialValue: string; 
  onSave: (val: string) => void; 
  onCancel?: () => void; 
  placeholder?: string;
  minHeight?: string;
  members?: { id: string; displayName: string; devTag: string; avatarUrl: string | null }[];
  saveLabel?: string;
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
        class: `focus:outline-none p-3 text-[15px] leading-relaxed [&_p.is-editor-empty:first-child::before]:text-faint [&_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_p.is-editor-empty:first-child::before]:pointer-events-none [&_p.is-editor-empty:first-child::before]:float-left [&_p.is-editor-empty:first-child::before]:h-0 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-1 [&_strong]:font-bold [&_em]:italic [&_s]:line-through [&_u]:underline [&_a]:text-accent [&_a:hover]:underline [&_pre]:bg-surface [&_pre]:p-2 [&_pre]:rounded [&_code]:bg-surface [&_code]:px-1 [&_code]:rounded`,
        style: `min-height: ${minHeight};`
      }
    }
  });

  if (!editor) return null;

  const mentionCandidates = mentionQuery !== null 
    ? members.filter((m) => m.displayName.toLowerCase().includes(mentionQuery.toLowerCase()) || m.devTag.toLowerCase().includes(mentionQuery.toLowerCase())) 
    : [];

  return (
    <div className="flex flex-col rounded-xl border border-separator focus-within:border-accent bg-surface shadow-sm overflow-visible min-h-0 relative transition">
      <div className="flex items-center gap-1 border-b border-separator/50 p-1 bg-sidebar/50 flex-wrap shrink-0 rounded-t-[11px]">
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
        className="flex-1 overflow-y-auto cursor-text bg-surface/50 rounded-b-[11px]" 
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
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
             e.preventDefault();
             e.stopPropagation();
             const md = (editor.storage as any).markdown.getMarkdown();
             onSave(md);
             if (!onCancel) editor.commands.setContent(""); // Reset if it's a persistent input
          }
        }}
      />
      <div className="flex items-center justify-end gap-2 p-2 border-t border-separator/50 bg-surface rounded-b-[11px]">
        {onCancel && <button type="button" onClick={onCancel} className="cursor-pointer px-3 py-1.5 text-sm font-medium text-muted hover:text-foreground">Cancel</button>}
        <button type="button" onClick={() => {
          const md = (editor.storage as any).markdown.getMarkdown();
          onSave(md);
          if (!onCancel) editor.commands.setContent(""); // Reset if it's a persistent input
        }} className="cursor-pointer rounded-lg bg-accent px-4 py-1.5 text-sm font-medium text-accent-foreground transition hover:brightness-110">{saveLabel}</button>
      </div>
    </div>
  );
}
