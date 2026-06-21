# Snippets App — IDE-Grade Code Sharing Platform

> **Goal**: Transform the current basic snippet viewer (title + code + language + comments)
> into a proper developer-focused code sharing tool — think GitHub Gists meets VS Code.
> Folders for organization, a rich code editor with IDE behaviors, 50+ languages,
> forking, version history, markdown descriptions, pinning, and search.
> All within the macOS desktop metaphor.

---

## Current State

### Database (`snippets` table)
```sql
id, workspace_id, user_id, title, language (varchar 40), code (text), created_at
```
`snippet_comments` table: `id, snippet_id, user_id, content, created_at`

### Backend (`com.devcollab.snippet`)
- `Snippet.java`, `SnippetComment.java` entities
- `SnippetService.java` — list, create, get (with comments), delete, addComment
- 9 supported languages in frontend: `plaintext, ts, tsx, js, jsx, css, json, html, bash`

### Frontend (`snippets-app.tsx`, `lib/snippets.ts`)
- Left sidebar: flat list of snippets (language badge + title + author + comment count)
- Right panel: title, author, Shiki syntax-highlighted code block (read-only), comments thread
- Create modal: title input + language dropdown + plain `<textarea>` for code
- No editing, no folders, no search, no forking, no descriptions

---

## Phase 1 — Data Model Expansion (Backend)

### 1.1 Flyway Migration: `V12__snippets_upgrade.sql`

```sql
-- =========================================================================
-- Snippet collections (folders / categories)
-- =========================================================================
CREATE TABLE snippet_collections (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name         VARCHAR(100) NOT NULL,
    color        VARCHAR(7) NOT NULL DEFAULT '#8e8e93',   -- hex for sidebar dot
    icon         VARCHAR(30) DEFAULT 'folder',            -- lucide icon name
    position     DOUBLE PRECISION NOT NULL DEFAULT 1000,  -- ordering
    created_by   UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (workspace_id, name)
);
CREATE INDEX idx_snippet_collections_ws ON snippet_collections(workspace_id);

-- =========================================================================
-- Snippet tags (lightweight labels, workspace-scoped)
-- =========================================================================
CREATE TABLE snippet_tags (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name         VARCHAR(40) NOT NULL,
    UNIQUE (workspace_id, name)
);

CREATE TABLE snippet_tag_map (
    snippet_id UUID NOT NULL REFERENCES snippets(id) ON DELETE CASCADE,
    tag_id     UUID NOT NULL REFERENCES snippet_tags(id) ON DELETE CASCADE,
    PRIMARY KEY (snippet_id, tag_id)
);

-- =========================================================================
-- Snippet revisions (version history)
-- =========================================================================
CREATE TABLE snippet_revisions (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    snippet_id UUID NOT NULL REFERENCES snippets(id) ON DELETE CASCADE,
    code       TEXT NOT NULL,
    language   VARCHAR(40) NOT NULL,
    message    VARCHAR(200),                              -- optional commit message
    user_id    UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_snippet_revisions ON snippet_revisions(snippet_id, created_at DESC);

-- =========================================================================
-- Snippet stars (bookmarks / favorites)
-- =========================================================================
CREATE TABLE snippet_stars (
    snippet_id UUID NOT NULL REFERENCES snippets(id) ON DELETE CASCADE,
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (snippet_id, user_id)
);

-- =========================================================================
-- Expand snippets table
-- =========================================================================
ALTER TABLE snippets
    ADD COLUMN collection_id UUID REFERENCES snippet_collections(id) ON DELETE SET NULL,
    ADD COLUMN description   TEXT,                     -- markdown description / notes
    ADD COLUMN forked_from   UUID REFERENCES snippets(id) ON DELETE SET NULL,
    ADD COLUMN pinned        BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN visibility    VARCHAR(20) NOT NULL DEFAULT 'WORKSPACE',  -- WORKSPACE | PRIVATE
    ADD COLUMN updated_at    TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX idx_snippets_collection ON snippets(collection_id);
CREATE INDEX idx_snippets_forked ON snippets(forked_from);
```

### 1.2 Backend Entities

#### New entities:
| File | Purpose |
|---|---|
| `SnippetCollection.java` | Folder/category entity |
| `SnippetTag.java` | Tag entity |
| `SnippetTagMap.java` | Join entity (or `@ManyToMany`) |
| `SnippetRevision.java` | Version history entry |
| `SnippetStar.java` | Bookmark (composite key entity) |

#### Modify existing:
| File | Changes |
|---|---|
| `Snippet.java` | Add: `collectionId`, `description`, `forkedFrom`, `pinned`, `visibility`, `updatedAt`. Add `@PreUpdate` for `updatedAt`. |
| `SnippetComment.java` | Add: `editedAt` field (already in schema but not in entity yet — enable comment editing) |

### 1.3 New/Updated DTOs

| DTO | Fields |
|---|---|
| `SnippetResponse` (update) | Add: `description`, `collectionId`, `collectionName`, `forkedFrom` (id + title), `pinned`, `visibility`, `starred` (by current user), `starCount`, `tags`, `updatedAt` |
| `CreateSnippetRequest` (update) | Add: `description`, `collectionId`, `tagNames`, `visibility` |
| `UpdateSnippetRequest` [NEW] | `title`, `language`, `code`, `description`, `collectionId`, `tagNames`, `pinned`, `visibility`, `revisionMessage` |
| `CollectionResponse` | `id`, `name`, `color`, `icon`, `snippetCount` |
| `CreateCollectionRequest` | `name`, `color`, `icon` |
| `UpdateCollectionRequest` | `name`, `color`, `icon` |
| `TagResponse` | `id`, `name`, `count` |
| `RevisionResponse` | `id`, `code`, `language`, `message`, `author`, `createdAt` |

### 1.4 New Services

| Service | Responsibility |
|---|---|
| `SnippetCollectionService` | CRUD collections. Reorder. List with snippet counts. |
| `SnippetTagService` | Auto-create tags on snippet save. List tags with counts. Delete unused. |
| `SnippetRevisionService` | Save a revision on every edit. List revisions. Restore a revision. |
| `SnippetStarService` | Star/unstar a snippet. List starred snippets. |

### 1.5 Update `SnippetService.java`
- `create`: handle `description`, `collectionId`, `tags`, `visibility`. Save initial revision.
- `update` [NEW]: update all fields, save new revision with optional message, update `updatedAt`.
- `list`: accept filter params: `collectionId`, `tag`, `search` (title full-text), `starred`, `mine`. Return enriched response.
- `fork` [NEW]: clone snippet with `forkedFrom` set, create under current user.
- `get`: populate `starred` (for current user), `starCount`, `tags`, `forkedFrom` info.

### 1.6 New REST Endpoints

#### Snippet Updates
```
PATCH  /api/snippets/{id}                              → SnippetResponse (update)
POST   /api/snippets/{id}/fork                         → SnippetResponse (fork)
```

#### Collections
```
GET    /api/workspaces/{wsId}/snippet-collections       → List<CollectionResponse>
POST   /api/workspaces/{wsId}/snippet-collections       → CollectionResponse
PUT    /api/snippet-collections/{id}                    → CollectionResponse
DELETE /api/snippet-collections/{id}                    → 204
```

#### Tags
```
GET    /api/workspaces/{wsId}/snippet-tags              → List<TagResponse>
DELETE /api/snippet-tags/{id}                           → 204
```

#### Stars
```
POST   /api/snippets/{id}/star                          → 204
DELETE /api/snippets/{id}/star                          → 204
GET    /api/workspaces/{wsId}/snippets/starred           → List<SnippetResponse>
```

#### Revisions
```
GET    /api/snippets/{id}/revisions                     → List<RevisionResponse>
POST   /api/snippets/{id}/revisions/{revId}/restore     → SnippetResponse
```

---

## Phase 2 — Frontend: Snippets App Overhaul

### 2.1 Expanded Language Support

Replace the hardcoded 9-language list with a comprehensive set covering all major languages a developer would use. Group them by category in the picker:

```ts
export const LANGUAGE_GROUPS = {
  "Web": ["html", "css", "scss", "less", "javascript", "typescript", "jsx", "tsx", "svelte", "vue", "astro"],
  "Backend": ["java", "kotlin", "scala", "go", "rust", "python", "ruby", "php", "csharp", "fsharp", "elixir", "erlang", "swift", "dart"],
  "Systems": ["c", "cpp", "zig", "nim", "assembly"],
  "Data & Config": ["json", "yaml", "toml", "xml", "csv", "graphql", "protobuf"],
  "Shell & DevOps": ["bash", "zsh", "fish", "powershell", "dockerfile", "hcl", "nix"],
  "Database": ["sql", "plsql", "prisma"],
  "Docs & Markup": ["markdown", "latex", "plaintext"],
  "Other": ["lua", "r", "matlab", "haskell", "clojure", "ocaml", "perl", "groovy", "v"]
} as const;
```

The language picker should be a **searchable grouped dropdown** — not a flat `<select>`:
- Type to filter
- Show language icon/color dot next to each
- Show the group headers
- Sorted by frequency of use (recent languages at the top)

Update the `CodeBlock` component's `SUPPORTED` set and Shiki's `mapLang` to cover all these. Shiki supports most of them natively.

### 2.2 Code Editor (Replace `<textarea>`)

Replace the plain `<textarea>` for code input with a proper code editing experience. Two approaches:

> [!IMPORTANT]
> **Recommended: Custom enhanced `<textarea>` with IDE behaviors** rather than pulling in a full CodeMirror/Monaco dependency. Keeps the bundle small and the macOS aesthetic intact.

Build a `CodeEditor` component that wraps a `<textarea>` with:

| Feature | Implementation |
|---|---|
| **Tab indentation** | Intercept `Tab` key → insert 2 spaces (or 4, configurable). `Shift+Tab` → dedent. |
| **Auto-indent** | On `Enter`, match the indentation of the previous line. If line ends with `{`, `(`, `[`, `:` → add one extra indent level. |
| **Auto-close brackets** | Typing `{` inserts `{}` with cursor between. Same for `(`, `[`, `"`, `` ` ``, `'`. |
| **Line numbers** | Render a gutter with line numbers synced to scroll position (separate `<div>` with matching line-height). |
| **Current line highlight** | Subtle background highlight on the line the cursor is on. |
| **Syntax highlighting overlay** | Use Shiki to render highlighted code behind the transparent textarea (contenteditable overlay pattern). |
| **Minimap** | Optional: a small zoomed-out preview of the code on the right edge (stretch goal). |
| **Font** | `SF Mono` / `JetBrains Mono` from `--font-code` token. 13px. |
| **Cmd+D** | Duplicate current line. |
| **Cmd+/** | Toggle line comment (language-aware: `//` for JS/TS/Java, `#` for Python/Bash, `--` for SQL, `/* */` for CSS). |
| **Cmd+Shift+K** | Delete current line. |
| **Cmd+Z / Cmd+Shift+Z** | Undo / redo (native textarea behavior). |
| **Word wrap toggle** | Button in the editor toolbar to toggle wrapping. |

The editor should feel snappy and native — not like a "web editor" but like a lightweight VS Code textarea.

### 2.3 Sidebar Redesign

Replace the flat snippet list with a structured sidebar:

```
┌─────────────────────────────────┐
│ Snippets                    [+] │
├─────────────────────────────────┤
│ [🔍 Search snippets...]        │
│                                 │
│ ★ Starred                       │  ← filter: show only starred
│ 📌 Pinned                       │  ← filter: show only pinned
│ 👤 My Snippets                  │  ← filter: show only mine
│ 📋 All Snippets                 │  ← no filter
│                                 │
│ ─── COLLECTIONS ────────── [+]  │
│ 🔵 API Utils              (12) │
│ 🟢 React Patterns          (8) │
│ 🟣 SQL Queries              (5) │
│ 🔴 Bug Workarounds          (3) │
│ ── Uncategorized           (14) │
│                                 │
│ ─── TAGS ───────────────────    │
│ auth (7)  react (5)  sql (4)   │
│ hooks (3)  css (2)  perf (2)   │
│                                 │
├─────────────────────────────────┤
│ [Snippet list matching filter]  │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ TS  useDebounce        ★ 📌│ │
│ │ Alice · 2h ago    💬 3     │ │
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │ SQL  get-active-users       │ │
│ │ Bob · 1d ago       💬 1    │ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```

Implementation:
- **Search bar** at the top — filters snippets by title, code content, tags (client-side for speed, API for full-text)
- **Quick filters**: Starred, Pinned, My Snippets, All — as clickable sidebar items with counts
- **Collections**: expandable/collapsible folder groups. Click to filter. Drag snippets into folders.
- **Tags cloud**: shown below collections. Click a tag to filter.
- **Snippet cards**: show star icon (filled/hollow), pin icon, language badge, title, author, time, comment count

### 2.4 Snippet Detail View Redesign

Transform the right panel into a full IDE-style viewer/editor:

```
┌──────────────────────────────────────────────────────────────────┐
│ ★ useDebounce                                    [Fork] [Edit] │
│ by Alice · 2h ago · TS · API Utils         ★ 5 stars  💬 3    │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│ ## Description                                                   │
│ Custom React hook for debouncing values. Useful for search       │
│ inputs, form validation, and API calls on keystroke.             │
│                                                                  │
│ Tags: [react] [hooks] [typescript] [utils]                       │
│                                                                  │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ typescript                                    [Copy] [Raw]  │ │
│ │──────────────────────────────────────────────────────────────│ │
│ │  1 │ import { useState, useEffect } from 'react';           │ │
│ │  2 │                                                        │ │
│ │  3 │ export function useDebounce<T>(value: T, delay: number)│ │
│ │  4 │   const [debounced, setDebounced] = useState(value);   │ │
│ │  5 │                                                        │ │
│ │  6 │   useEffect(() => {                                    │ │
│ │  7 │     const timer = setTimeout(() => {                   │ │
│ │  8 │       setDebounced(value);                             │ │
│ │  9 │     }, delay);                                         │ │
│ │ 10 │     return () => clearTimeout(timer);                  │ │
│ │ 11 │   }, [value, delay]);                                  │ │
│ │ 12 │                                                        │ │
│ │ 13 │   return debounced;                                    │ │
│ │ 14 │ }                                                      │ │
│ └──────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ ── Version History (3 revisions) ─────────────── [Show diff]    │
│ v3 · "Added generic type param" · Alice · 2h ago               │
│ v2 · "Fixed cleanup" · Alice · 1d ago                          │
│ v1 · Initial version · Alice · 3d ago                          │
│                                                                  │
│ ── Forked from ──────────────────────────────────               │
│ "debounce-util" by Bob                                          │
│                                                                  │
│ ── Comments (3) ──────────────────────────────────              │
│ 👤 Charlie · 1h ago                                             │
│ "Works great, using this in our search component"               │
│                                                                  │
│ [Comment input...]                                               │
└──────────────────────────────────────────────────────────────────┘
```

Key features:
- **Inline editing**: click "Edit" → code block becomes the `CodeEditor` component, all fields become editable, "Save" button appears with optional revision message
- **Fork button**: creates a copy under your name with `forkedFrom` link
- **Star button**: toggle star (bookmark) with star count
- **Pin**: mark snippet as pinned (appears at top of lists)
- **Description**: rendered as markdown, editable on click
- **Tags**: shown as pills, click `+` to add/create tags
- **Version history**: expandable list of revisions, click to view a past version, "Restore" button
- **Diff view**: compare two revisions side by side (stretch goal — use a simple line-diff)
- **Code block**: line numbers, copy button, raw view toggle, language badge

### 2.5 Create/Edit Snippet Panel

Instead of a modal, open a full editor panel:

```
┌──────────────────────────────────────────────────────────────────┐
│ New Snippet                                      [Cancel] [Save]│
├──────────────────────────────────────────────────────────────────┤
│ Title: [________________________]                                │
│ Language: [TypeScript ▼]  Collection: [API Utils ▼]             │
│ Tags: [react] [hooks] [+ Add tag]                               │
│ Visibility: (● Workspace) (○ Private)                           │
│                                                                  │
│ Description (optional):                                          │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ Markdown supported...                                       │ │
│ └──────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ Code:                                                            │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │  1 │                                                        │ │
│ │  2 │                                                        │ │
│ │  3 │                                  ← CodeEditor component│ │
│ │  4 │                                                        │ │
│ │  5 │                                                        │ │
│ └──────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ Revision message (optional): [Describe your changes...]          │
└──────────────────────────────────────────────────────────────────┘
```

### 2.6 Collection Management

A small panel for managing collections:
- **Create**: name + color picker (palette of 8-10 preset colors) + icon picker (subset of Lucide icons)
- **Edit**: same fields
- **Delete**: confirm dialog, moves snippets to Uncategorized
- **Reorder**: drag collections in the sidebar to reorder
- **Drag snippet to collection**: drag a snippet card from the list into a collection folder

### 2.7 Tag System

Tags are lightweight, auto-created, workspace-scoped:
- When creating/editing a snippet, type tag names in a multi-select input
- Tags auto-complete from existing workspace tags
- New tag names are created on-the-fly
- Clicking a tag in the sidebar or detail view filters the snippet list
- Unused tags are cleaned up periodically (or on demand)

---

## Phase 3 — Polish & Developer Experience

### 3.1 Keyboard Shortcuts (in the Snippets app)
| Shortcut | Action |
|---|---|
| `Cmd+N` | New snippet |
| `Cmd+E` | Edit current snippet |
| `Cmd+S` | Save (when editing) |
| `Cmd+D` | Duplicate (fork) current snippet |
| `/` | Focus search |
| `Esc` | Cancel edit / close panels |
| `Cmd+C` (in code view) | Copy entire code block |

### 3.2 Code Block Enhancements
- **Line highlighting**: hover a line → subtle highlight, click to select line (useful for comments referencing line numbers)
- **Line linking**: ability to share a link to a specific line range (like GitHub `#L5-L10`)
- **Word wrap toggle**: button in the code block header
- **Font size control**: small / medium / large toggle

### 3.3 Share & Link
- **Copy link**: button to copy a deep link to the snippet (`projects://snippet/{id}`)
- **Paste in chat**: pasting a snippet link in chat renders an inline preview card
- **Task references**: mention snippet IDs in task descriptions

### 3.4 Real-time Updates
- Subscribe to `/topic/workspace.{wsId}.snippets` for live updates
- When another user creates/edits/comments on a snippet, update in real-time
- Show a subtle indicator if someone else is currently editing

### 3.5 Import / Export
- **Import**: paste a URL from GitHub Gist → auto-extract code + language + title
- **Export**: download snippet as a file with the correct extension (e.g. `useDebounce.ts`)
- **Multi-file snippets** (stretch goal): support multiple files in a single snippet (like Gists)

---

## File Change Summary

### Backend — New Files
| File | Purpose |
|---|---|
| `V12__snippets_upgrade.sql` | Flyway migration |
| `SnippetCollection.java` | Collection entity |
| `SnippetTag.java` | Tag entity |
| `SnippetTagMap.java` | Join entity |
| `SnippetRevision.java` | Revision entity |
| `SnippetStar.java` | Star entity |
| `SnippetCollectionRepository.java` | JPA repo |
| `SnippetTagRepository.java` | JPA repo |
| `SnippetTagMapRepository.java` | JPA repo |
| `SnippetRevisionRepository.java` | JPA repo |
| `SnippetStarRepository.java` | JPA repo |
| `SnippetCollectionService.java` | Collection CRUD |
| `SnippetTagService.java` | Tag management |
| `SnippetRevisionService.java` | Version history |
| `SnippetStarService.java` | Star/unstar |
| `SnippetCollectionController.java` | REST endpoints |
| `CollectionResponse.java` | DTO |
| `CreateCollectionRequest.java` | DTO |
| `UpdateCollectionRequest.java` | DTO |
| `TagResponse.java` | DTO |
| `RevisionResponse.java` | DTO |
| `UpdateSnippetRequest.java` | DTO |

### Backend — Modified Files
| File | Changes |
|---|---|
| `Snippet.java` | Add: collectionId, description, forkedFrom, pinned, visibility, updatedAt |
| `SnippetService.java` | Add: update, fork, starred/star/unstar, filter params on list, revision creation on edit |
| `SnippetController.java` | Add: PATCH, fork, star/unstar, revisions, collections endpoints |
| `SnippetResponse.java` | Add: all new fields |
| `CreateSnippetRequest.java` | Add: description, collectionId, tagNames, visibility |

### Frontend — New Files
| File | Purpose |
|---|---|
| `components/ui/code-editor.tsx` | Enhanced textarea with IDE behaviors |
| `lib/snippet-collections.ts` | Collection API calls |
| `lib/snippet-tags.ts` | Tag API calls |

### Frontend — Modified Files
| File | Changes |
|---|---|
| `lib/snippets.ts` | Expand types, add: update, fork, star/unstar, revisions, filter APIs |
| `components/ui/code-block.tsx` | Add: line numbers, line highlighting, word wrap toggle |
| `components/apps/snippets-app.tsx` | Full rewrite: structured sidebar, collection navigation, enriched detail view, inline editing, version history, fork/star/pin |

---

## Execution Order

> [!TIP]
> Build bottom-up: database → entities → services → controllers → frontend types → UI components.

- [ ] 1. **Migration** — `V12__snippets_upgrade.sql`
- [ ] 2. **Entities** — `SnippetCollection`, `SnippetTag`, `SnippetRevision`, `SnippetStar`, update `Snippet`
- [ ] 3. **Repositories** — All new repos
- [ ] 4. **DTOs** — All new request/response records, update existing
- [ ] 5. **Services** — `SnippetCollectionService`, `SnippetTagService`, `SnippetRevisionService`, `SnippetStarService`, update `SnippetService`
- [ ] 6. **Controllers** — New endpoints + update `SnippetController`
- [ ] 7. **Frontend types** — `lib/snippets.ts`, `lib/snippet-collections.ts`, `lib/snippet-tags.ts`
- [ ] 8. **CodeEditor component** — Enhanced textarea with Tab, auto-indent, bracket closing, line numbers
- [ ] 9. **CodeBlock upgrade** — Line numbers, line highlighting, word wrap
- [ ] 10. **Language picker** — Searchable grouped dropdown with 50+ languages
- [ ] 11. **Sidebar redesign** — Collections, tags, filters, search
- [ ] 12. **Detail view** — Description, tags, version history, fork, star, inline editing
- [ ] 13. **Create/edit panel** — Full editor with all fields
- [ ] 14. **Collection management** — CRUD, color picker, drag-to-organize
- [ ] 15. **Polish** — Keyboard shortcuts, real-time updates, share links, export

---

## Design Guidelines

- Keep the **macOS aesthetic**: the editor should feel like a native TextEdit/Xcode mini-editor, not VS Code
- Use `--font-code` (`SF Mono` / `JetBrains Mono`) for all code
- Editor background: `var(--surface)` with subtle `var(--separator)` gutter border
- Line numbers: `var(--faint)` color, right-aligned in gutter
- Current line highlight: `var(--hover)` background
- Collection colors: use the same palette approach as labels (preset palette + custom)
- Tags: small rounded pills with `var(--hover)` background, `var(--foreground)` text
- Star icon: `lucide-react` `Star` (filled when starred, outline when not), colored `#ffcc00`
- Revision list: vertical timeline with dots and connecting line
- All animations: Framer Motion with `macSpring` / `softSpring` from `lib/motion.ts`
- Mobile: collapse sidebar into a hamburger, stack editor full-width
