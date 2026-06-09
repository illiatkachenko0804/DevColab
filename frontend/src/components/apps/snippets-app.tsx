"use client";

import { MessageSquare, Plus } from "lucide-react";
import { useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { CodeBlock } from "@/components/ui/code-block";
import { snippets, userById } from "@/lib/mock";
import { cn, relativeTime } from "@/lib/utils";

export function SnippetsApp() {
  const [activeId, setActiveId] = useState(snippets[0].id);
  const active = snippets.find((s) => s.id === activeId)!;
  const author = userById(active.authorId);

  return (
    <div className="flex min-h-0 flex-1">
      {/* List */}
      <div className="flex w-72 shrink-0 flex-col border-r border-separator bg-sidebar">
        <div className="flex h-12 items-center justify-between border-b border-separator px-4">
          <span className="font-semibold">Snippets</span>
          <button type="button" aria-label="New snippet" className="cursor-pointer text-faint hover:text-foreground">
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 no-scrollbar">
          {snippets.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setActiveId(s.id)}
              className={cn(
                "mb-1 flex w-full cursor-pointer flex-col gap-1 rounded-lg border px-3 py-2.5 text-left transition-colors",
                activeId === s.id ? "border-separator bg-surface" : "border-transparent hover:bg-hover",
              )}
            >
              <div className="flex items-center gap-2">
                <span className="rounded px-1.5 py-0.5 font-mono text-[10px] uppercase text-white" style={{ background: "var(--app-snippets)" }}>
                  {s.lang}
                </span>
                <span className="truncate text-sm font-medium">{s.title}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted">
                <Avatar name={userById(s.authorId).name} size={16} />
                {userById(s.authorId).name.split(" ")[0]} · {relativeTime(s.at)}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Detail */}
      <div className="flex min-w-0 flex-1 flex-col overflow-y-auto no-scrollbar">
        <div className="border-b border-separator p-5">
          <h2 className="text-xl font-semibold tracking-tight">{active.title}</h2>
          <div className="mt-2 flex items-center gap-2 text-sm text-muted">
            <Avatar name={author.name} size={22} />
            {author.name}
            <span>· {relativeTime(active.at)} ago</span>
            <span className="flex items-center gap-1">
              <MessageSquare className="h-3.5 w-3.5" /> {active.comments}
            </span>
          </div>
        </div>
        <div className="p-5">
          <CodeBlock code={active.code} lang={active.lang} />
        </div>
        <div className="border-t border-separator p-5">
          <h3 className="mb-3 text-sm font-semibold text-muted">Comments</h3>
          <div className="space-y-4">
            {[
              { id: "cm1", uid: "u2", text: "Clean — using this in the Dock right away." },
              { id: "cm2", uid: "u4", text: "Could we expose the stiffness as a prop?" },
            ].map((c) => (
              <div key={c.id} className="flex gap-3">
                <Avatar name={userById(c.uid).name} size={30} />
                <div>
                  <p className="text-sm font-semibold">{userById(c.uid).name}</p>
                  <p className="text-sm text-foreground/85">{c.text}</p>
                </div>
              </div>
            ))}
          </div>
          <input
            placeholder="Add a comment…"
            aria-label="Add a comment"
            className="mt-4 w-full rounded-lg border border-separator bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </div>
      </div>
    </div>
  );
}
