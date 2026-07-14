"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, X, Folder, Lock, Globe } from "lucide-react";
import { useEffect, useState } from "react";
import { createSnippet } from "@/lib/snippets";
import { markNotificationReadByLink } from "@/lib/notifications";
import { subscribe } from "@/lib/ws";
import { useOS } from "@/stores/os";
import { Sidebar } from "./snippets/sidebar";
import { DetailView } from "./snippets/detail-view";
import { CodeEditor } from "./snippets/code-editor";
import { LanguagePicker } from "./snippets/language-picker";

export function SnippetsApp() {
  const ws = useOS((s) => s.activeWorkspace);
  const me = useOS((s) => s.user);
  const qc = useQueryClient();
  
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  
  // Filter States
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "starred" | "mine">("all");
  const [collectionId, setCollectionId] = useState<string | null>(null);
  const [tag, setTag] = useState<string | null>(null);

  // Deep-link from chat
  const pendingSnippet = useOS((s) => s.pendingSnippet);
  const setPendingSnippet = useOS((s) => s.setPendingSnippet);

  useEffect(() => {
    if (pendingSnippet) {
      setSelectedId(pendingSnippet);
      setPendingSnippet(null);
      // Mark snippet notifications as read
      if (ws) {
        markNotificationReadByLink(ws, "snippet", pendingSnippet).then(() => {
          qc.invalidateQueries({ queryKey: ["notifications", ws] });
        });
      }
    }
  }, [pendingSnippet, setPendingSnippet, ws, qc]);

  // WebSocket real-time updates
  useEffect(() => {
    if (!ws) return;
    const unsub = subscribe(`/topic/workspace.${ws}.snippets`, () => {
      setTimeout(() => {
        qc.invalidateQueries({ queryKey: ["snippets"] });
        qc.invalidateQueries({ queryKey: ["snippet-collections"] });
        qc.invalidateQueries({ queryKey: ["snippet-tags"] });
        qc.invalidateQueries({ queryKey: ["snippet"] });
      }, 100);
    });
    return () => unsub();
  }, [ws, qc]);

  return (
    <div className="relative flex min-h-0 flex-1 bg-surface/30 text-foreground">
      <Sidebar 
        ws={ws}
        selectedId={selectedId}
        onSelect={setSelectedId}
        search={search}
        setSearch={setSearch}
        filter={filter}
        setFilter={setFilter}
        collectionId={collectionId}
        setCollectionId={setCollectionId}
        tag={tag}
        setTag={setTag}
        onCreateClick={() => setCreating(true)}
      />

      <div className="min-w-0 flex-1 relative">
        {selectedId && me ? (
          <DetailView 
            key={selectedId} 
            id={selectedId} 
            ws={ws}
            meId={me.id}
            onDeleted={() => setSelectedId(null)}
            onCommented={() => {}}
            onForked={(newId) => setSelectedId(newId)}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground flex-col gap-4">
            <div className="h-16 w-16 rounded-2xl bg-surface border border-separator flex items-center justify-center text-4xl shadow-sm">
              ✨
            </div>
            <p>Select a snippet from the sidebar or create a new one.</p>
          </div>
        )}
      </div>

      {creating && (
        <NewSnippet 
          ws={ws} 
          onClose={() => setCreating(false)} 
          onCreated={(id) => { 
            setCreating(false); 
            qc.invalidateQueries({ queryKey: ["snippets", ws] }); 
            setSelectedId(id); 
          }} 
        />
      )}
    </div>
  );
}

function NewSnippet({ ws, onClose, onCreated }: { ws: string; onClose: () => void; onCreated: (id: string) => void }) {
  const [title, setTitle] = useState("");
  const [language, setLanguage] = useState("typescript");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<"WORKSPACE" | "PRIVATE">("WORKSPACE");

  const create = useMutation({
    mutationFn: () => createSnippet(ws, { 
      title: title.trim(), 
      language, 
      code, 
      description,
      visibility 
    }),
    onSuccess: (s) => onCreated(s.id),
  });

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 sm:p-6" onClick={onClose}>
      <div className="flex w-[95%] h-[95%] max-w-6xl flex-col rounded-xl border border-separator bg-surface shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-separator px-6 py-4 bg-surface/50">
          <h2 className="text-lg font-semibold">Create New Snippet</h2>
          <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground transition-colors"><X className="h-5 w-5" /></button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
          <div className="flex gap-4">
            <div className="flex-1 space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Title</label>
              <input 
                value={title} 
                onChange={(e) => setTitle(e.target.value)} 
                placeholder="e.g. React useDebounce hook" 
                className="w-full h-10 rounded-md border border-separator bg-surface px-3 text-sm outline-none focus:border-accent" 
                autoFocus
              />
            </div>
            <div className="w-64 space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Language</label>
              <div className="h-10">
                <LanguagePicker value={language} onChange={setLanguage} />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Description (Markdown)</label>
            <textarea 
              value={description} 
              onChange={(e) => setDescription(e.target.value)} 
              placeholder="What does this snippet do? How do you use it?" 
              className="w-full h-20 resize-y rounded-md border border-separator bg-surface p-3 text-sm outline-none focus:border-accent" 
            />
          </div>

          <div className="flex-1 flex flex-col space-y-1.5 min-h-[200px]">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex justify-between">
              Code
              <span className="font-normal text-muted-foreground/60">Supports Cmd+D, Cmd+/, Auto-indent</span>
            </label>
            <div className="flex-1 relative">
              <CodeEditor value={code} onChange={setCode} language={language} />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-separator p-4 bg-surface/50 flex items-center justify-between">
          <div className="flex gap-2 bg-surface border border-separator rounded-md p-1">
            <button 
              onClick={() => setVisibility("WORKSPACE")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-sm transition-colors ${visibility === "WORKSPACE" ? "bg-accent/10 text-accent" : "text-muted-foreground hover:bg-hover"}`}
            >
              <Globe className="h-3.5 w-3.5" /> Workspace
            </button>
            <button 
              onClick={() => setVisibility("PRIVATE")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-sm transition-colors ${visibility === "PRIVATE" ? "bg-accent/10 text-accent" : "text-muted-foreground hover:bg-hover"}`}
            >
              <Lock className="h-3.5 w-3.5" /> Private
            </button>
          </div>

          <div className="flex gap-3">
            <button onClick={onClose} className="px-5 py-2 text-sm font-medium border border-separator rounded-md hover:bg-hover transition-colors">Cancel</button>
            <button 
              onClick={() => create.mutate()} 
              disabled={create.isPending || !title.trim() || !code.trim()} 
              className="px-5 py-2 text-sm font-semibold bg-accent text-accent-foreground rounded-md hover:brightness-110 disabled:opacity-50 transition-colors"
            >
              {create.isPending ? "Creating..." : "Create Snippet"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
