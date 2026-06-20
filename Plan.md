# Projects App — Jira-Like Kanban Upgrade

> **Goal**: Transform the current minimal Kanban board (title + assignee + due) into a
> full-featured, Jira-class project management tool that real developer teams would
> actually use. Every change must respect the existing macOS desktop UI metaphor
> (glassmorphism, traffic lights, Framer Motion, Tailwind design tokens).

---

## Current State

### Database (`tasks` table)
```sql
id, column_id, title, description, assignee_id, due_date, position, created_by, created_at, updated_at
```

### Backend (`com.devcollab.board`)
- `Task.java` entity, `BoardService.java` — CRUD + move (fractional ordering)
- DTOs: `CreateTaskRequest`, `UpdateTaskRequest`, `MoveTaskRequest`, `TaskResponse`
- Board auto-seeds "Todo / In Progress / Done" per workspace

### Frontend (`kanban-app.tsx`, `lib/board.ts`)
- `@dnd-kit` drag-and-drop between columns
- Task detail modal: title, assignee select, due date picker, delete — that's it.

---

## Phase 1 — Data Model Expansion (Backend)

### 1.1 New Flyway Migration: `V8__kanban_upgrade.sql`

> [!IMPORTANT]
> All new tables and columns below. Run as a single migration.

```sql
-- =========================================================================
-- Labels (colored tags, workspace-scoped)
-- =========================================================================
CREATE TABLE labels (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name         VARCHAR(50) NOT NULL,
    color        VARCHAR(7) NOT NULL DEFAULT '#6e6e73',  -- hex color
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (workspace_id, name)
);

CREATE TABLE task_labels (
    task_id  UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    label_id UUID NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
    PRIMARY KEY (task_id, label_id)
);

-- =========================================================================
-- Task comments
-- =========================================================================
CREATE TABLE task_comments (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id    UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content    TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    edited_at  TIMESTAMPTZ
);
CREATE INDEX idx_task_comments_task ON task_comments(task_id, created_at);

-- =========================================================================
-- Sprints (workspace-scoped, time-boxed iterations)
-- =========================================================================
CREATE TABLE sprints (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name         VARCHAR(120) NOT NULL,
    goal         TEXT,
    status       VARCHAR(20) NOT NULL DEFAULT 'PLANNING',  -- PLANNING | ACTIVE | COMPLETED
    start_date   DATE,
    end_date     DATE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_sprints_workspace ON sprints(workspace_id);

-- =========================================================================
-- Expand tasks table
-- =========================================================================
ALTER TABLE tasks
    ADD COLUMN task_key      VARCHAR(20),              -- e.g. "DC-42" (workspace prefix + sequence)
    ADD COLUMN type          VARCHAR(20) NOT NULL DEFAULT 'TASK',  -- TASK | BUG | STORY | EPIC
    ADD COLUMN priority      VARCHAR(20) NOT NULL DEFAULT 'MEDIUM', -- CRITICAL | HIGH | MEDIUM | LOW | NONE
    ADD COLUMN story_points  SMALLINT,                 -- Fibonacci: 1,2,3,5,8,13,21
    ADD COLUMN sprint_id     UUID REFERENCES sprints(id) ON DELETE SET NULL,
    ADD COLUMN parent_id     UUID REFERENCES tasks(id) ON DELETE SET NULL,  -- subtask hierarchy
    ADD COLUMN reporter_id   UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX idx_tasks_sprint ON tasks(sprint_id);
CREATE INDEX idx_tasks_parent ON tasks(parent_id);

-- Generate task keys for existing tasks
CREATE SEQUENCE IF NOT EXISTS task_key_seq START WITH 1;
```

### 1.2 Backend Entities & DTOs

#### New entities to create:
| File | Purpose |
|---|---|
| `Label.java` | JPA entity for `labels` |
| `TaskLabel.java` | Composite-key entity for `task_labels` (or use `@ManyToMany` on Task) |
| `TaskComment.java` | JPA entity for `task_comments` |
| `Sprint.java` | JPA entity for `sprints` |

#### Modify existing:
| File | Changes |
|---|---|
| `Task.java` | Add fields: `taskKey`, `type` (enum `TaskType`), `priority` (enum `Priority`), `storyPoints`, `sprintId`, `parentId`, `reporterId`. Add `@ManyToMany` labels relationship. |
| `TaskResponse.java` | Add: `taskKey`, `type`, `priority`, `storyPoints`, `sprint` (nested `SprintSummary`), `parentId`, `labels` (list of `LabelResponse`), `assignee`, `reporter`, `commentCount`, `subtaskCount`, `subtasksDone` |
| `CreateTaskRequest.java` | Add: `type`, `priority`, `storyPoints`, `sprintId`, `parentId`, `labelIds` |
| `UpdateTaskRequest.java` | Add same new fields |

#### New DTOs:
| DTO | Fields |
|---|---|
| `LabelResponse` | `id`, `name`, `color` |
| `CreateLabelRequest` | `name`, `color` |
| `CommentResponse` | `id`, `author` (nested), `content`, `createdAt`, `editedAt` |
| `CreateCommentRequest` | `content` |
| `SprintResponse` | `id`, `name`, `goal`, `status`, `startDate`, `endDate`, `taskCount`, `completedCount`, `totalPoints`, `completedPoints` |
| `CreateSprintRequest` | `name`, `goal`, `startDate`, `endDate` |
| `UpdateSprintRequest` | `name`, `goal`, `startDate`, `endDate`, `status` |

### 1.3 New Services

| Service | Responsibility |
|---|---|
| `LabelService.java` | CRUD labels for a workspace. Attach/detach labels to/from tasks. |
| `TaskCommentService.java` | CRUD comments on a task. Notify mentioned users. |
| `SprintService.java` | CRUD sprints. Start/complete sprint. Query sprint burndown data (tasks done, points remaining over time). |

### 1.4 Modify `BoardService.java`
- `createTask`: auto-generate `taskKey` (e.g. "DC-{seq}"), set `reporterId` to current user, handle `labelIds`, `sprintId`, `parentId`
- `updateTask`: handle new fields (type, priority, storyPoints, sprint, labels)
- `toResponse`: populate labels, comment count, subtask count/done, reporter

### 1.5 New REST Controllers

#### `LabelController.java`
```
GET    /api/workspaces/{wsId}/labels           → List<LabelResponse>
POST   /api/workspaces/{wsId}/labels           → LabelResponse
PUT    /api/labels/{id}                        → LabelResponse
DELETE /api/labels/{id}                        → 204
POST   /api/tasks/{taskId}/labels/{labelId}    → 204 (attach)
DELETE /api/tasks/{taskId}/labels/{labelId}    → 204 (detach)
```

#### `TaskCommentController.java`
```
GET    /api/tasks/{taskId}/comments            → List<CommentResponse>
POST   /api/tasks/{taskId}/comments            → CommentResponse
PUT    /api/comments/{id}                      → CommentResponse
DELETE /api/comments/{id}                      → 204
```

#### `SprintController.java`
```
GET    /api/workspaces/{wsId}/sprints          → List<SprintResponse>
POST   /api/workspaces/{wsId}/sprints          → SprintResponse
PUT    /api/sprints/{id}                       → SprintResponse
DELETE /api/sprints/{id}                       → 204
POST   /api/sprints/{id}/start                 → SprintResponse  (status → ACTIVE)
POST   /api/sprints/{id}/complete              → SprintResponse  (status → COMPLETED, move undone tasks to backlog)
```

### 1.6 Task Key Generation
- Store a `task_key_counter` per workspace (either in `workspaces` table or as a Redis atomic counter)
- On task create: increment counter, format as `"{WORKSPACE_SLUG_PREFIX}-{counter}"` (e.g. `DC-1`, `DC-2`)
- Display this key prominently on cards — this is the Jira ticket number equivalent

---

## Phase 2 — Frontend: Kanban Board Upgrade

### 2.1 Update `lib/board.ts` — Types & API

Expand `BoardTask` interface:
```ts
export interface BoardTask {
  id: string;
  columnId: string;
  taskKey: string;           // "DC-42"
  title: string;
  description: string | null;
  type: TaskType;            // "TASK" | "BUG" | "STORY" | "EPIC"
  priority: Priority;        // "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "NONE"
  storyPoints: number | null;
  due: string | null;
  position: number;
  sprintId: string | null;
  parentId: string | null;
  assignee: TaskAssignee | null;
  reporter: TaskAssignee | null;
  labels: Label[];
  commentCount: number;
  subtaskCount: number;
  subtasksDone: number;
}
```

Add new API functions:
```ts
// Labels
export function listLabels(ws: string): Promise<Label[]>
export function createLabel(ws: string, body: { name: string; color: string }): Promise<Label>
export function deleteLabel(id: string): Promise<void>
export function attachLabel(taskId: string, labelId: string): Promise<void>
export function detachLabel(taskId: string, labelId: string): Promise<void>

// Comments
export function listComments(taskId: string): Promise<Comment[]>
export function createComment(taskId: string, content: string): Promise<Comment>
export function updateComment(id: string, content: string): Promise<Comment>
export function deleteComment(id: string): Promise<void>

// Sprints
export function listSprints(ws: string): Promise<Sprint[]>
export function createSprint(ws: string, body: CreateSprintBody): Promise<Sprint>
export function updateSprint(id: string, body: UpdateSprintBody): Promise<Sprint>
export function startSprint(id: string): Promise<Sprint>
export function completeSprint(id: string): Promise<Sprint>
export function deleteSprint(id: string): Promise<void>
```

### 2.2 Task Card Redesign (`TaskCard` component)

The card in the Kanban column should show at a glance:

```
┌─────────────────────────────────────────┐
│ [BUG] DC-42                        🔴 H │  ← type icon + key + priority dot
│                                         │
│ Fix auth token refresh on Safari        │  ← title
│                                         │
│ ┌──────┐ ┌────────┐ ┌──────────┐        │
│ │ auth │ │ safari │ │ frontend │        │  ← label pills (colored)
│ └──────┘ └────────┘ └──────────┘        │
│                                         │
│ 📅 Jun 25  💬 3  📎 2/4     5SP  👤 AA  │  ← due, comments, subtasks, points, avatar
└─────────────────────────────────────────┘
```

Implementation details:
- **Type icon**: Bug = 🐛, Story = 📖, Task = ✅, Epic = ⚡ (use Lucide icons: `Bug`, `BookOpen`, `CheckSquare`, `Zap`)
- **Priority dot**: colored circle — Critical = red pulse, High = orange, Medium = yellow, Low = blue, None = gray
- **Label pills**: small rounded badges with the label's background color + white/dark text
- **Subtask progress**: show as `done/total` with a tiny progress bar
- **Story points**: small badge in bottom-right
- **Assignee avatar**: existing `Avatar` component, bottom-right

### 2.3 Task Detail Panel (Full Redesign)

Replace the current simple modal with a **split-panel slide-over** (like Jira's task detail):

```
┌─────────────────────────────────────────────────────┐
│  [← Back]   DC-42                        [X Close] │
├──────────────────────────────┬──────────────────────┤
│                              │  DETAILS             │
│  Title (editable inline)     │  ─────────           │
│                              │  Status:  In Progress│
│  Description                 │  Type:    🐛 Bug     │
│  (rich text / markdown       │  Priority: 🔴 High   │
│   editable area)             │  Assignee: [avatar]  │
│                              │  Reporter: [avatar]  │
│                              │  Sprint:  Sprint 3   │
│  ──── SUBTASKS ────          │  Story Pts: 5        │
│  ☑ Write unit tests          │  Due:     Jun 25     │
│  ☐ Update docs               │  Labels:  [pills]    │
│  [+ Add subtask]             │  Created: Jun 20     │
│                              │                      │
│  ──── COMMENTS ────          │                      │
│  👤 Alice · 2h ago           │                      │
│  "Reproduced on Safari 17"  │                      │
│                              │                      │
│  👤 You · just now           │                      │
│  "Fixed in commit abc123"    │                      │
│                              │                      │
│  [Comment input box]         │                      │
└──────────────────────────────┴──────────────────────┘
```

Implementation:
- **Left panel** (main content area): Title (contenteditable), Description (markdown editor or textarea), Subtasks list, Comments thread
- **Right sidebar** (metadata): All fields as inline-editable dropdowns/pickers
- Opens as an **overlay** covering the full kanban window interior (not a browser modal)
- Use `AnimatePresence` + `motion.div` for slide-in from the right
- All changes auto-save on blur/change (no "Save" button — Jira-style)

### 2.4 Subtasks

- Show subtasks as a checklist inside the task detail panel
- Each subtask is a real `Task` entity with `parentId` pointing to the parent
- Subtask card is simpler: checkbox + title + assignee
- Creating a subtask: inline input inside the parent detail panel
- Parent task card shows `subtasksDone / subtaskCount` with a mini progress bar

### 2.5 Sprint Management UI

Add a **sprint bar** above the board columns:

```
┌──────────────────────────────────────────────────────────┐
│ 🏃 Sprint 3 — "API Stabilization"   Jun 10 → Jun 24    │
│ ████████████░░░░░  12/18 tasks · 34/55 pts              │
│                               [Complete Sprint] [▼ More]│
└──────────────────────────────────────────────────────────┘
```

- **Sprint selector dropdown**: switch between sprints or view "Backlog" (tasks with no sprint)
- **Sprint planning view**: shows backlog tasks on the left, sprint tasks on the right, drag between them
- **Complete sprint dialog**: shows summary (done/undone), lets user choose where to move undone tasks (next sprint / backlog)
- **Sprint creation form**: name, goal, start date, end date

### 2.6 Board Header Toolbar

Replace the current minimal header with a full toolbar:

```
┌──────────────────────────────────────────────────────────────────┐
│ Tasks · 18 tasks                                                │
│                                                                  │
│ [Sprint ▼] [Filter ▼] [Group by ▼]  [Search 🔍]  [+ New Task]  │
└──────────────────────────────────────────────────────────────────┘
```

- **Sprint dropdown**: pick active sprint / backlog / "All"
- **Filter dropdown**: filter by assignee, label, type, priority — chips appear below the toolbar showing active filters
- **Group by**: default is "Status" (columns). Could also group by assignee or priority (future stretch)
- **Quick search**: filters task cards by title/key in real-time (client-side)
- **New Task button**: opens a create-task form with all the new fields

### 2.7 Create Task Form

A panel/modal for creating a task with all fields:

| Field | Control |
|---|---|
| Title | Text input (required) |
| Type | Segmented control: Task / Bug / Story / Epic |
| Description | Textarea / markdown |
| Priority | Dropdown: Critical / High / Medium / Low / None |
| Assignee | Member picker dropdown |
| Reporter | Auto-filled to current user |
| Labels | Multi-select tag picker (with color dots) |
| Sprint | Dropdown (active sprint / backlog) |
| Story Points | Number input (suggest Fibonacci: 1,2,3,5,8,13,21) |
| Due Date | Date picker |
| Column | Dropdown (which column to place it in) |

### 2.8 Label Management

Add a label manager accessible from the board toolbar or task detail:
- List all workspace labels with color preview
- Create new label: name + color picker (preset palette + custom hex)
- Edit / delete existing labels
- Inline in the task detail: click "+" next to labels to add from existing or create new

---

## Phase 3 — Polish & Developer UX

### 3.1 Keyboard Shortcuts (in the Kanban app)
| Shortcut | Action |
|---|---|
| `N` | New task (in focused column) |
| `E` | Edit focused task |
| `/` | Focus search |
| `1-4` | Set priority (1=Critical, 4=Low) |
| `Esc` | Close detail panel |

### 3.2 Column Management
- Allow renaming columns (double-click header)
- Allow adding/removing columns
- Column WIP limits (optional: show warning when a column exceeds N tasks)

### 3.3 Drag-and-Drop Enhancements
- Multi-select tasks (Shift+click) and drag multiple
- Drag tasks between sprint and backlog in planning view

### 3.4 Activity Integration
- When a task is created/moved/updated, emit an activity event
- Show relevant activities in the task detail panel ("DC-42 moved to In Progress by Alice, 2h ago")

### 3.5 Real-time Board Updates via WebSocket
- Subscribe to `/topic/workspace.{wsId}.board` for live updates
- When another user moves/creates/updates a task, update the board in real-time
- Show a small toast or animation when a card moves

---

## File Change Summary

### Backend — New Files
| File | Purpose |
|---|---|
| `V8__kanban_upgrade.sql` | Flyway migration |
| `Label.java` | Label entity |
| `TaskLabel.java` | Join entity (or use `@ManyToMany`) |
| `TaskComment.java` | Comment entity |
| `Sprint.java` | Sprint entity |
| `LabelRepository.java` | JPA repo |
| `TaskLabelRepository.java` | JPA repo |
| `TaskCommentRepository.java` | JPA repo |
| `SprintRepository.java` | JPA repo |
| `LabelService.java` | Label CRUD + attach/detach |
| `TaskCommentService.java` | Comment CRUD |
| `SprintService.java` | Sprint lifecycle |
| `LabelController.java` | REST endpoints |
| `TaskCommentController.java` | REST endpoints |
| `SprintController.java` | REST endpoints |
| `LabelResponse.java` | DTO |
| `CreateLabelRequest.java` | DTO |
| `CommentResponse.java` | DTO |
| `CreateCommentRequest.java` | DTO |
| `SprintResponse.java` | DTO |
| `CreateSprintRequest.java` | DTO |
| `UpdateSprintRequest.java` | DTO |

### Backend — Modified Files
| File | Changes |
|---|---|
| `Task.java` | Add new fields: taskKey, type, priority, storyPoints, sprintId, parentId, reporterId, labels relation |
| `BoardService.java` | Handle new fields in create/update/toResponse. Auto-generate taskKey. |
| `TaskResponse.java` | Add all new fields |
| `CreateTaskRequest.java` | Add new fields |
| `UpdateTaskRequest.java` | Add new fields |

### Frontend — New Files
| File | Purpose |
|---|---|
| `lib/labels.ts` | Label API calls |
| `lib/comments.ts` | Comment API calls |
| `lib/sprints.ts` | Sprint API calls |

### Frontend — Modified Files
| File | Changes |
|---|---|
| `lib/board.ts` | Expand types, add new API functions |
| `components/apps/kanban-app.tsx` | Complete rewrite: new card design, task detail panel, sprint bar, filters, toolbar, label management, subtasks |

---

## Execution Order

> [!TIP]
> Build bottom-up: database → entities → services → controllers → frontend types → UI components.

- [x] 1. **Migration** — `V10__kanban_upgrade.sql` (Note: V8 and V9 already exist, so using V10)
- [x] 2. **Entities** — `Label`, `TaskComment`, `Sprint`, update `Task`
- [x] 3. **Repositories** — All new repos
- [x] 4. **Services** — `LabelService`, `TaskCommentService`, `SprintService`, update `BoardService`
- [x] 5. **DTOs** — All new request/response records, update existing ones
- [x] 6. **Controllers** — `LabelController`, `TaskCommentController`, `SprintController`
- [x] 7. **Frontend types** — `lib/board.ts`, `lib/labels.ts`, `lib/comments.ts`, `lib/sprints.ts`
- [x] 8. **Task card** — Redesigned `TaskCard` with type icon, priority, labels, metadata
- [x] 9. **Task detail panel** — Split-panel with description, subtasks, comments, sidebar metadata
- [ ] 10. **Sprint management** — Sprint bar, selector, planning view, create/complete
- [ ] 11. **Board toolbar** — Filters, search, sprint picker, create task form
- [ ] 12. **Label management** — Create/edit labels, attach to tasks
- [ ] 13. **Polish** — Keyboard shortcuts, column management, real-time updates

---

## Design Guidelines

- Keep the **macOS aesthetic**: glassmorphism cards, soft shadows, Apple color palette, Framer Motion animations
- Use existing design tokens from `globals.css` (`--surface`, `--glass`, `--separator`, `--shadow-card`, etc.)
- Priority colors: Critical = `var(--danger)`, High = `var(--warning)`, Medium = `#e8c800`, Low = `var(--info)`, None = `var(--faint)`
- Type icons from Lucide: `Bug`, `BookOpen`, `CheckSquare`, `Zap`
- All interactive elements need hover states, focus-visible rings, and smooth transitions
- Task detail panel should feel like a native macOS inspector panel
- Maintain mobile responsiveness (collapse sprint bar, stack columns vertically on small screens)
