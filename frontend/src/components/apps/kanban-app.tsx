"use client";

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type Modifier,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarClock, Plus, Trash2, X,
  CheckSquare, Bug, Bookmark, Zap,
  ArrowUp, ArrowRight, ArrowDown, AlertCircle,
  MessageSquare, Layers, Search, List as ListIcon, KanbanSquare
} from "lucide-react";
import { useEffect, useMemo, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { Avatar } from "@/components/ui/avatar";
import {
  createTask as apiCreateTask,
  deleteTask as apiDeleteTask,
  getBoard,
  getSprints,
  moveTask as apiMoveTask,
  updateTask as apiUpdateTask,
  type BoardColumn,
  type BoardTask,
} from "@/lib/board";
import { listMembers } from "@/lib/members";
import { markNotificationReadByLink } from "@/lib/notifications";
import { subscribe } from "@/lib/ws";
import { usePermissions } from "@/lib/workspaces";
import { cn } from "@/lib/utils";
import { useOS } from "@/stores/os";
import { TaskDetail } from "./task-detail";
import { CreateTaskModal } from "./create-task-modal";
import { BacklogView } from "./backlog-view";

type MovePayload = { taskId: string; columnId: string; position: number };

function columnForId(columns: BoardColumn[], id: string): BoardColumn | undefined {
  return columns.find((c) => c.id === id) ?? columns.find((c) => c.tasks.some((t) => t.id === id));
}

function reorderForDrop(columns: BoardColumn[], activeId: string, overId: string): { columns: BoardColumn[]; move: MovePayload } | null {
  const source = columnForId(columns, activeId);
  const target = columnForId(columns, overId);
  const activeTask = source?.tasks.find((t) => t.id === activeId);
  if (!source || !target || !activeTask) return null;

  const overIsColumn = target.id === overId;
  const next = columns.map((c) => ({ ...c, tasks: [...c.tasks] }));
  const sourceNext = next.find((c) => c.id === source.id)!;
  const targetNext = next.find((c) => c.id === target.id)!;

  if (source.id === target.id) {
    const oldIndex = sourceNext.tasks.findIndex((t) => t.id === activeId);
    const newIndex = overIsColumn ? sourceNext.tasks.length - 1 : sourceNext.tasks.findIndex((t) => t.id === overId);
    if (oldIndex < 0 || newIndex < 0) return null;
    sourceNext.tasks = arrayMove(sourceNext.tasks, oldIndex, newIndex);
  } else {
    sourceNext.tasks = sourceNext.tasks.filter((t) => t.id !== activeId);
    const targetWithoutActive = targetNext.tasks.filter((t) => t.id !== activeId);
    const insertAt = overIsColumn
      ? targetWithoutActive.length
      : Math.max(0, targetWithoutActive.findIndex((t) => t.id === overId));
    const moved = { ...activeTask, columnId: target.id };
    targetWithoutActive.splice(insertAt, 0, moved);
    targetNext.tasks = targetWithoutActive;
  }

  const finalTarget = next.find((c) => c.tasks.some((t) => t.id === activeId));
  if (!finalTarget) return null;
  const idx = finalTarget.tasks.findIndex((t) => t.id === activeId);
  const prevPos = finalTarget.tasks[idx - 1]?.position ?? 0;
  const nextPos = finalTarget.tasks[idx + 1]?.position;
  const position = nextPos != null ? (prevPos + nextPos) / 2 : prevPos + 1000;
  finalTarget.tasks = finalTarget.tasks.map((t) =>
    t.id === activeId ? { ...t, columnId: finalTarget.id, position } : t,
  );

  return { columns: next, move: { taskId: activeId, columnId: finalTarget.id, position } };
}

function moveFromCurrentOrder(columns: BoardColumn[], activeId: string): MovePayload | null {
  const column = columns.find((c) => c.tasks.some((t) => t.id === activeId));
  if (!column) return null;
  const idx = column.tasks.findIndex((t) => t.id === activeId);
  if (idx < 0) return null;
  const prevPos = column.tasks[idx - 1]?.position ?? 0;
  const nextPos = column.tasks[idx + 1]?.position;
  const position = nextPos != null ? (prevPos + nextPos) / 2 : prevPos + 1000;
  return { taskId: activeId, columnId: column.id, position };
}

export function KanbanApp() {
  const ws = useOS((s) => s.activeWorkspace);
  const qc = useQueryClient();
  const permissions = usePermissions();
  const canManageTasks = permissions.manageTasks === true;

  const boardQuery = useQuery({ queryKey: ["board", ws], queryFn: () => getBoard(ws), enabled: !!ws });
  const appRef = useRef<HTMLDivElement>(null);

  const [cols, setCols] = useState<BoardColumn[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [openTask, setOpenTask] = useState<BoardTask | null>(null);
  const colsRef = useRef<BoardColumn[]>([]);
  const lastOverIdRef = useRef<string | null>(null);
  
  // Toolbar state
  const [activeView, setActiveView] = useState<"BOARD" | "BACKLOG">("BOARD");
  const [selectedSprintId, setSelectedSprintId] = useState<string | "ALL">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [creatingTask, setCreatingTask] = useState<string | boolean>(false);

  const pendingTask = useOS((s) => s.pendingTask);
  const setPendingTask = useOS((s) => s.setPendingTask);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const sprintsQuery = useQuery({ queryKey: ["sprints", ws], queryFn: () => getSprints(ws), enabled: !!ws });
  const sprints = sprintsQuery.data ?? [];

  const activeIdRef = useRef(activeId);
  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  useEffect(() => {
    colsRef.current = cols;
  }, [cols]);

  useEffect(() => {
    if (boardQuery.data && !activeIdRef.current) {
      colsRef.current = boardQuery.data.columns;
      setCols(boardQuery.data.columns);
    }
  }, [boardQuery.data]);

  // WebSocket Subscriptions
  useEffect(() => {
    if (!ws) return;
    const unsubBoard = subscribe(`/topic/workspace.${ws}.board`, (raw) => {
      qc.invalidateQueries({ queryKey: ["board", ws] });
    });
    const unsubSprints = subscribe(`/topic/workspace.${ws}.sprints`, (raw) => {
      qc.invalidateQueries({ queryKey: ["sprints", ws] });
    });
    return () => {
      unsubBoard();
      unsubSprints();
    };
  }, [ws, qc]);

  const allTasks = useMemo(() => cols.flatMap((c) => c.tasks), [cols]);
  const taskById = useMemo(() => {
    const m: Record<string, BoardTask> = {};
    allTasks.forEach((t) => (m[t.id] = t));
    return m;
  }, [allTasks]);

  // Keep openTask in sync with live board data
  useEffect(() => {
    if (openTask) {
      const updated = taskById[openTask.id];
      if (updated && updated !== openTask) {
        queueMicrotask(() => setOpenTask(updated));
      }
    }
  }, [openTask, taskById]);

  // Handle deep linking
  useEffect(() => {
    if (pendingTask && allTasks.length > 0) {
      const taskToOpen = allTasks.find(t => t.id === pendingTask);
      if (taskToOpen) {
        queueMicrotask(() => {
          setOpenTask(taskToOpen);
          setPendingTask(null);
        });
        // Mark task notifications as read
        if (ws) {
          markNotificationReadByLink(ws, "task", pendingTask).then(() => {
            qc.invalidateQueries({ queryKey: ["notifications", ws] });
          });
        }
      }
    }
  }, [pendingTask, allTasks, setPendingTask, ws, qc]);

  const filteredCols = useMemo(() => {
    return cols.map((c) => ({
      ...c,
      tasks: c.tasks.filter((t) => {
        if (selectedSprintId !== "ALL" && t.sprintId !== (selectedSprintId === "BACKLOG" ? null : selectedSprintId)) return false;
        if (searchQuery) {
          const sq = searchQuery.toLowerCase();
          const matchTitle = t.title.toLowerCase().includes(sq);
          const matchKey = t.taskKey.toLowerCase().includes(sq);
          const matchDesc = t.description?.toLowerCase().includes(sq);
          if (!matchTitle && !matchKey && !matchDesc) return false;
        }
        return true;
      }),
    }));
  }, [cols, selectedSprintId, searchQuery]);

  const taskCount = filteredCols.reduce((acc, c) => acc + c.tasks.length, 0);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["board", ws] });
  const move = useMutation({
    mutationFn: (v: { taskId: string; columnId: string; position: number }) => apiMoveTask(v.taskId, v.columnId, v.position),
    onError: invalidate,
  });
  const create = useMutation({
    mutationFn: (v: { columnId: string; title: string }) => apiCreateTask(v.columnId, { title: v.title }),
    onSuccess: () => { invalidate(); setAddingTo(null); setNewTitle(""); },
  });

  const onDragOver = (e: DragOverEvent) => {
    const { active, over } = e;
    if (!over) return;
    const overId = String(over.id);
    lastOverIdRef.current = overId;
    const next = reorderForDrop(colsRef.current, String(active.id), overId);
    if (!next) return;
    colsRef.current = next.columns;
    setCols(next.columns);
  };

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    const activeTaskId = String(active.id);
    activeIdRef.current = null;
    setActiveId(null);
    if (!over) {
      lastOverIdRef.current = null;
      invalidate();
      return;
    }
    const overId = String(over.id);
    const next = lastOverIdRef.current === overId
      ? { columns: colsRef.current, move: moveFromCurrentOrder(colsRef.current, activeTaskId) }
      : reorderForDrop(colsRef.current, activeTaskId, overId);
    lastOverIdRef.current = null;
    if (!next?.move) {
      invalidate();
      return;
    }
    colsRef.current = next.columns;
    setCols(next.columns);
    move.mutate(next.move);
  };

  const restrictToApp: Modifier = ({ transform, draggingNodeRect }) => {
    if (!appRef.current || !draggingNodeRect) return transform;
    const rect = appRef.current.getBoundingClientRect();
    return {
      ...transform,
      x: Math.max(rect.left - draggingNodeRect.left, Math.min(rect.right - draggingNodeRect.right, transform.x)),
      y: Math.max(rect.top - draggingNodeRect.top, Math.min(rect.bottom - draggingNodeRect.bottom, transform.y)),
    };
  };

  return (
    <div ref={appRef} className="flex min-h-0 flex-1 flex-col bg-surface/30">
      {/* Toolbar */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-separator px-4 bg-surface">
        <div className="flex items-center gap-4">
          <div className="flex items-center rounded-lg bg-sidebar p-1 border border-separator shadow-sm">
            <button
              onClick={() => setActiveView("BOARD")}
              className={cn("flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition", activeView === "BOARD" ? "bg-surface shadow-sm text-foreground" : "text-muted hover:text-foreground")}
            >
              <KanbanSquare className="h-4 w-4" /> Board
            </button>
            <button
              onClick={() => setActiveView("BACKLOG")}
              className={cn("flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition", activeView === "BACKLOG" ? "bg-surface shadow-sm text-foreground" : "text-muted hover:text-foreground")}
            >
              <ListIcon className="h-4 w-4" /> Backlog
            </button>
          </div>

          <div className="h-6 w-px bg-separator"></div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">Sprint:</span>
            <select
              value={selectedSprintId}
              onChange={(e) => setSelectedSprintId(e.target.value)}
              className="cursor-pointer rounded-lg border border-transparent bg-sidebar px-2 py-1 text-sm font-medium outline-none hover:border-separator focus:border-accent transition"
            >
              <option value="ALL">All Sprints</option>
              <option value="BACKLOG">Backlog (No Sprint)</option>
              {sprints.map((s) => (
                <option key={s.id} value={s.id}>{s.name} {s.status === "ACTIVE" ? "(Active)" : ""}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tasks..."
              className="w-48 rounded-full border border-separator bg-sidebar pl-9 pr-3 py-1.5 text-sm outline-none transition focus:border-accent focus:w-64"
            />
          </div>
          {canManageTasks && (
            <button
              onClick={() => setCreatingTask(true)}
              className="flex items-center gap-1.5 rounded-lg bg-accent px-4 py-1.5 text-sm font-semibold text-accent-foreground transition hover:brightness-110 shadow-sm"
            >
              <Plus className="h-4 w-4" /> Create
            </button>
          )}
        </div>
      </div>

      {activeView === "BOARD" ? (
        <div className="min-h-0 flex-1 overflow-x-auto p-4 no-scrollbar">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={(e: DragStartEvent) => {
              const id = String(e.active.id);
              activeIdRef.current = id;
              lastOverIdRef.current = null;
              setActiveId(id);
            }}
            onDragOver={onDragOver}
            onDragEnd={onDragEnd}
            onDragCancel={() => {
              activeIdRef.current = null;
              lastOverIdRef.current = null;
              setActiveId(null);
              invalidate();
            }}
          >
            <div className="flex h-full gap-4">
              {filteredCols.map((col) => (
                <ColumnView
                  key={col.id}
                  column={col}
                  onOpenTask={setOpenTask}
                  adding={addingTo === col.id}
                  onStartAdd={() => { setAddingTo(col.id); setNewTitle(""); }}
                  newTitle={newTitle}
                  setNewTitle={setNewTitle}
                  onSubmitAdd={() => newTitle.trim() && create.mutate({ columnId: col.id, title: newTitle.trim() })}
                  onCancelAdd={() => setAddingTo(null)}

                  canManageTasks={canManageTasks}
                />
              ))}
            </div>
            {typeof document !== "undefined"
              ? createPortal(
                  <DragOverlay modifiers={[restrictToApp]}>
                    {activeId && taskById[activeId] ? <TaskCard task={taskById[activeId]} dragging /> : null}
                  </DragOverlay>,
                  document.body
                )
              : null}
          </DndContext>
        </div>
      ) : (
        <BacklogView ws={ws} allTasks={allTasks} onOpenTask={setOpenTask} onTaskChanged={invalidate} onCreateTaskInSprint={(sprintId) => setCreatingTask(sprintId || true)} />
      )}

      {openTask && (
        <TaskDetail
          key={openTask.id}
          ws={ws}
          task={openTask}
          onOpenTask={setOpenTask}
          onClose={() => setOpenTask(null)}
          onChanged={invalidate}
        />
      )}
      {creatingTask && <CreateTaskModal ws={ws} columnId={cols[0]?.id ?? ""} initialSprintId={typeof creatingTask === "string" ? creatingTask : (selectedSprintId !== "ALL" && selectedSprintId !== "BACKLOG" ? selectedSprintId : undefined)} onClose={() => setCreatingTask(false)} onCreated={(t) => { setCreatingTask(false); setOpenTask(t); }} />}
    </div>
  );
}

function ColumnView({
  column, onOpenTask, adding, onStartAdd, newTitle, setNewTitle, onSubmitAdd, onCancelAdd, canManageTasks
}: {
  column: BoardColumn;
  onOpenTask: (t: BoardTask) => void;
  adding: boolean;
  onStartAdd: () => void;
  newTitle: string;
  setNewTitle: (v: string) => void;
  onSubmitAdd: () => void;
  onCancelAdd: () => void;

  canManageTasks?: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  const accent = column.name === "Done" ? "var(--success)" : column.name === "In Progress" ? "var(--app-projects)" : "var(--faint)";
  return (
    <div className="flex h-full min-w-[250px] flex-1 flex-col">
      <div className="mb-2 flex shrink-0 items-center gap-2 px-1">
        <span className="h-2 w-2 rounded-full" style={{ background: accent }} />
        <h3 className="text-sm font-semibold">{column.name}</h3>
        <span className="rounded-full bg-hover px-1.5 text-xs text-muted">{column.tasks.length}</span>
      </div>
      <SortableContext items={column.tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div ref={setNodeRef} className={cn("flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto rounded-xl border border-dashed p-2 no-scrollbar transition-colors", isOver ? "border-accent bg-accent/5" : "border-separator/70")}>
          {column.tasks.map((t) => <SortableCard key={t.id} task={t} onOpen={() => onOpenTask(t)} disabled={!canManageTasks} />)}
          {adding && canManageTasks && (
            <form onSubmit={(e) => { e.preventDefault(); onSubmitAdd(); }} className="rounded-[var(--radius-card)] border border-separator bg-surface p-2">
              <input autoFocus value={newTitle} onChange={(e) => setNewTitle(e.target.value)} onBlur={() => !newTitle.trim() && onCancelAdd()} placeholder="Task title…" className="w-full bg-transparent text-sm outline-none placeholder:text-faint" />
            </form>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

function SortableCard({ task, onOpen, disabled }: { task: BoardTask; onOpen: () => void; disabled?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id, disabled });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Translate.toString(transform), transition }} className={cn("cursor-grab touch-none", isDragging && "opacity-40")} {...attributes} {...listeners} onClick={onOpen}>
      <TaskCard task={task} />
    </div>
  );
}

function TypeIcon({ type }: { type: BoardTask["type"] }) {
  switch (type) {
    case "BUG": return <Bug className="h-3.5 w-3.5 text-danger" />;
    case "STORY": return <Bookmark className="h-3.5 w-3.5 text-success" />;
    case "EPIC": return <Zap className="h-3.5 w-3.5 text-purple-500" />;
    case "TASK":
    default:
      return <CheckSquare className="h-3.5 w-3.5 text-blue-500" />;
  }
}

function PriorityIcon({ priority }: { priority: BoardTask["priority"] }) {
  switch (priority) {
    case "URGENT": return <AlertCircle className="h-3.5 w-3.5 text-danger" />;
    case "HIGH": return <ArrowUp className="h-3.5 w-3.5 text-orange-500" />;
    case "MEDIUM": return <ArrowRight className="h-3.5 w-3.5 text-yellow-500" />;
    case "LOW":
    default:
      return <ArrowDown className="h-3.5 w-3.5 text-blue-400" />;
  }
}

function TaskCard({ task, dragging }: { task: BoardTask; dragging?: boolean }) {
  return (
    <div className={cn("group flex flex-col gap-2 rounded-[var(--radius-card)] border border-separator bg-surface p-3 shadow-[var(--shadow-card)] transition-all hover:border-accent/40", dragging && "rotate-2 cursor-grabbing border-accent/70 shadow-[var(--shadow-pop)] ring-1 ring-accent/30")}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <TypeIcon type={task.type} />
          <span className="text-[10px] font-bold tracking-wider text-muted group-hover:text-faint">{task.taskKey}</span>
        </div>
        {task.storyPoints != null && (
          <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-separator/50 px-1 text-[10px] font-semibold text-faint">
            {task.storyPoints}
          </span>
        )}
      </div>

      <p className="text-sm font-medium leading-snug text-foreground">{task.title}</p>

      {task.labels && task.labels.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {[...task.labels].sort((a, b) => a.name.localeCompare(b.name)).map((l) => (
            <span key={l.id} className="rounded px-1.5 py-0.5 text-[10px] font-medium" style={{ backgroundColor: `${l.color}20`, color: l.color }}>
              {l.name}
            </span>
          ))}
        </div>
      )}

      <div className="mt-1 flex items-center justify-between text-muted">
        <div className="flex items-center gap-3">
          <PriorityIcon priority={task.priority} />
          {task.due && <span className="flex items-center gap-1 text-[11px]"><CalendarClock className="h-3 w-3" />{formatDue(task.due)}</span>}
          {task.subtaskCount > 0 && (
            <span className="flex items-center gap-1 text-[11px]">
              <Layers className="h-3 w-3" />
              {task.subtasksDone}/{task.subtaskCount}
            </span>
          )}
          {task.commentCount > 0 && (
            <span className="flex items-center gap-1 text-[11px]">
              <MessageSquare className="h-3 w-3" />
              {task.commentCount}
            </span>
          )}
        </div>
        {task.assignee && <Avatar name={task.assignee.displayName} url={task.assignee.avatarUrl} size={20} />}
      </div>
    </div>
  );
}

function formatDue(d: string): string {
  const date = new Date(d + "T00:00:00");
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
