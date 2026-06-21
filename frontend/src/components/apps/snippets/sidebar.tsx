import { useQuery } from "@tanstack/react-query";
import { Folder, Hash, Search, Star, MessageSquare, Pin, Plus } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { cn, relativeTime } from "@/lib/utils";
import { listSnippets, listSnippetCollections, listSnippetTags, Snippet } from "@/lib/snippets";

interface SidebarProps {
  ws: string;
  selectedId: string | null;
  onSelect: (id: string) => void;
  search: string;
  setSearch: (val: string) => void;
  filter: "all" | "starred" | "mine";
  setFilter: (f: "all" | "starred" | "mine") => void;
  collectionId: string | null;
  setCollectionId: (id: string | null) => void;
  tag: string | null;
  setTag: (t: string | null) => void;
  onCreateClick?: () => void;
}

export function Sidebar({
  ws,
  selectedId,
  onSelect,
  search,
  setSearch,
  filter,
  setFilter,
  collectionId,
  setCollectionId,
  tag,
  setTag,
  onCreateClick
}: SidebarProps) {
  const snippetsQuery = useQuery({
    queryKey: ["snippets", ws, { search, filter, collectionId, tag }],
    queryFn: () => listSnippets(ws, {
      search: search || undefined,
      starred: filter === "starred" ? true : undefined,
      mine: filter === "mine" ? true : undefined,
      collectionId: collectionId || undefined,
      tag: tag || undefined
    }),
    enabled: !!ws
  });
  const snippets = snippetsQuery.data ?? [];

  const colsQuery = useQuery({ queryKey: ["snippet-collections", ws], queryFn: () => listSnippetCollections(ws), enabled: !!ws });
  const tagsQuery = useQuery({ queryKey: ["snippet-tags", ws], queryFn: () => listSnippetTags(ws), enabled: !!ws });
  
  const cols = colsQuery.data ?? [];
  const tagsData = tagsQuery.data ?? [];

  return (
    <div className="flex w-72 shrink-0 flex-col border-r border-separator bg-sidebar">
      {/* Header */}
      <div className="flex items-center justify-between p-3 pb-2">
        <span className="font-semibold px-2">Snippets</span>
        <button 
          onClick={onCreateClick}
          className="p-1 rounded-md text-muted-foreground hover:bg-hover hover:text-foreground transition-colors"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* Search Bar */}
      <div className="px-3 pb-3 border-b border-separator">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search snippets..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-surface pl-9 pr-3 py-2 text-sm rounded-md border border-separator outline-none focus:border-accent"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar pb-6">
        {/* Quick Filters */}
        <div className="p-2 space-y-0.5">
          <button 
            onClick={() => { setFilter("all"); setCollectionId(null); setTag(null); }}
            className={cn("w-full text-left px-2 py-1.5 rounded-md text-sm transition-colors", filter === "all" && !collectionId && !tag ? "bg-accent/10 text-accent font-medium" : "hover:bg-hover")}
          >
            All Snippets
          </button>
          <button 
            onClick={() => { setFilter("mine"); setCollectionId(null); setTag(null); }}
            className={cn("w-full text-left px-2 py-1.5 rounded-md text-sm transition-colors", filter === "mine" ? "bg-accent/10 text-accent font-medium" : "hover:bg-hover")}
          >
            My Snippets
          </button>
          <button 
            onClick={() => { setFilter("starred"); setCollectionId(null); setTag(null); }}
            className={cn("flex items-center w-full text-left px-2 py-1.5 rounded-md text-sm transition-colors", filter === "starred" ? "bg-accent/10 text-accent font-medium" : "hover:bg-hover")}
          >
            <Star className="h-4 w-4 mr-2" /> Starred
          </button>
        </div>

        {/* Collections */}
        {cols.length > 0 && (
          <div className="mt-4 px-2">
            <h3 className="px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Collections</h3>
            <div className="space-y-0.5">
              {cols.map(c => (
                <button
                  key={c.id}
                  onClick={() => { setCollectionId(c.id); setFilter("all"); setTag(null); }}
                  className={cn("flex items-center w-full text-left px-2 py-1.5 rounded-md text-sm transition-colors", collectionId === c.id ? "bg-accent/10 text-accent font-medium" : "hover:bg-hover")}
                >
                  <Folder className="h-4 w-4 mr-2" style={{ color: c.color }} />
                  <span className="flex-1 truncate">{c.name}</span>
                  <span className="text-xs text-muted-foreground">{c.snippetCount}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tags Cloud */}
        {tagsData.length > 0 && (
          <div className="mt-4 px-2">
            <h3 className="px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Tags</h3>
            <div className="flex flex-wrap gap-1 px-2">
              {tagsData.map(t => (
                <button
                  key={t.id}
                  onClick={() => { setTag(t.name); setFilter("all"); setCollectionId(null); }}
                  className={cn("flex items-center px-2 py-1 rounded-full text-xs transition-colors border", tag === t.name ? "bg-accent text-accent-foreground border-accent" : "bg-surface border-separator hover:border-accent/50 text-muted-foreground")}
                >
                  <Hash className="h-3 w-3 mr-1 opacity-50" />
                  {t.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Snippets List */}
        <div className="mt-6 px-2">
          <h3 className="px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Results ({snippets.length})</h3>
          <div className="space-y-1">
            {snippets.length === 0 && <p className="px-2 py-4 text-center text-sm text-muted">No snippets found.</p>}
            {snippets.map((s) => (
              <button
                key={s.id}
                onClick={() => onSelect(s.id)}
                className={cn(
                  "flex w-full flex-col gap-1.5 rounded-lg border px-3 py-2.5 text-left transition-colors",
                  selectedId === s.id ? "border-separator bg-surface shadow-sm" : "border-transparent hover:bg-hover"
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="rounded px-1.5 py-0.5 font-mono text-[10px] uppercase text-white" style={{ background: "var(--app-snippets)" }}>
                    {s.language}
                  </span>
                  <span className="flex-1 truncate text-sm font-medium">{s.title}</span>
                  {s.pinned && <Pin className="h-3 w-3 text-accent shrink-0" />}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted">
                  {s.author && <Avatar name={s.author.displayName} size={16} />}
                  <span className="truncate">{s.author?.displayName.split(" ")[0]}</span>
                  <span>· {relativeTime(s.createdAt)}</span>
                  
                  <div className="ml-auto flex gap-1.5">
                    {s.starred && <span className="flex items-center gap-0.5 text-yellow-500"><Star className="h-3 w-3 fill-current" /> {s.starCount}</span>}
                    {s.commentCount > 0 && <span className="flex items-center gap-0.5"><MessageSquare className="h-3 w-3" /> {s.commentCount}</span>}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
