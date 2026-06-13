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
} from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, Plus, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import {
  createTask as apiCreateTask,
  deleteTask as apiDeleteTask,
  getBoard,
  moveTask as apiMoveTask,
  updateTask as apiUpdateTask,
  type BoardColumn,
  type BoardTask,
} from "@/lib/board";
import { listMembers } from "@/lib/members";
import { cn } from "@/lib/utils";
import { useOS } from "@/stores/os";

export function KanbanApp() {
  const ws = useOS((s) => s.activeWorkspace);
  const qc = useQueryClient();
  const boardQuery = useQuery({ queryKey: ["board", ws], queryFn: () => getBoard(ws), enabled: !!ws });

  const [cols, setCols] = useState<BoardColumn[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [openTask, setOpenTask] = useState<BoardTask | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  useEffect(() => {
    if (boardQuery.data) setCols(boardQuery.data.columns);
  }, [boardQuery.data]);

  const taskById = useMemo(() => {
    const m: Record<string, BoardTask> = {};
    cols.forEach((c) => c.tasks.forEach((t) => (m[t.id] = t)));
    return m;
  }, [cols]);
  const taskCount = Object.keys(taskById).length;

  const invalidate = () => qc.invalidateQueries({ queryKey: ["board", ws] });
  const move = useMutation({
    mutationFn: (v: { taskId: string; columnId: string; position: number }) => apiMoveTask(v.taskId, v.columnId, v.position),
    onError: invalidate,
  });
  const create = useMutation({
    mutationFn: (v: { columnId: string; title: string }) => apiCreateTask(v.columnId, { title: v.title }),
    onSuccess: () => { invalidate(); setAddingTo(null); setNewTitle(""); },
  });

  const findCol = (id: string) => cols.find((c) => c.id === id) ?? cols.find((c) => c.tasks.some((t) => t.id === id));

  const onDragOver = (e: DragOverEvent) => {
    const { active, over } = e;
    if (!over) return;
    const from = findCol(active.id as string);
    const to = findCol(over.id as string);
    if (!from || !to || from.id === to.id) return;
    const moved = taskById[active.id as string];
    if (!moved) return;
    setCols((prev) =>
      prev.map((c) => {
        if (c.id === from.id) return { ...c, tasks: c.tasks.filter((t) => t.id !== active.id) };
        if (c.id === to.id) {
          const overIdx = c.tasks.findIndex((t) => t.id === over.id);
          const idx = overIdx >= 0 ? overIdx : c.tasks.length;
          const next = [...c.tasks];
          next.splice(idx, 0, moved);
          return { ...c, tasks: next };
        }
        return c;
      }),
    );
  };

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    setActiveId(null);
    if (!over) return;
    const col = findCol(active.id as string);
    if (!col) return;
    let tasks = col.tasks;
    const oldIndex = tasks.findIndex((t) => t.id === active.id);
    const newIndex = tasks.findIndex((t) => t.id === over.id);
    if (oldIndex !== newIndex && newIndex >= 0) {
      tasks = arrayMove(tasks, oldIndex, newIndex);
      setCols((prev) => prev.map((c) => (c.id === col.id ? { ...c, tasks } : c)));
    }
    const idx = tasks.findIndex((t) => t.id === active.id);
    const prevPos = tasks[idx - 1]?.position ?? 0;
    const nextPos = tasks[idx + 1]?.position;
    const position = nextPos != null ? (prevPos + nextPos) / 2 : prevPos + 1000;
    move.mutate({ taskId: active.id as string, columnId: col.id, position });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-separator px-4">
        <span className="font-semibold">{boardQuery.data?.name ?? "Board"}</span>
        <span className="text-sm text-muted">· {taskCount} task{taskCount === 1 ? "" : "s"}</span>
      </div>

      <div className="min-h-0 flex-1 overflow-x-auto p-4 no-scrollbar">
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={(e: DragStartEvent) => setActiveId(e.active.id as string)} onDragOver={onDragOver} onDragEnd={onDragEnd}>
          <div className="flex h-full gap-4">
            {cols.map((col) => (
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
              />
            ))}
          </div>
          <DragOverlay>{activeId && taskById[activeId] ? <TaskCard task={taskById[activeId]} dragging /> : null}</DragOverlay>
        </DndContext>
      </div>

      {openTask && <TaskDetail ws={ws} task={openTask} onClose={() => setOpenTask(null)} onChanged={invalidate} />}
    </div>
  );
}

function ColumnView({
  column, onOpenTask, adding, onStartAdd, newTitle, setNewTitle, onSubmitAdd, onCancelAdd,
}: {
  column: BoardColumn;
  onOpenTask: (t: BoardTask) => void;
  adding: boolean;
  onStartAdd: () => void;
  newTitle: string;
  setNewTitle: (v: string) => void;
  onSubmitAdd: () => void;
  onCancelAdd: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  const accent = column.name === "Done" ? "var(--success)" : column.name === "In Progress" ? "var(--app-projects)" : "var(--faint)";
  return (
    <div className="flex h-full min-w-[250px] flex-1 flex-col">
      <div className="mb-2 flex shrink-0 items-center gap-2 px-1">
        <span className="h-2 w-2 rounded-full" style={{ background: accent }} />
        <h3 className="text-sm font-semibold">{column.name}</h3>
        <span className="rounded-full bg-hover px-1.5 text-xs text-muted">{column.tasks.length}</span>
        <button type="button" aria-label="Add task" onClick={onStartAdd} className="ml-auto cursor-pointer text-faint hover:text-foreground"><Plus className="h-4 w-4" /></button>
      </div>
      <SortableContext items={column.tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div ref={setNodeRef} className={cn("flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto rounded-xl border border-dashed p-2 no-scrollbar transition-colors", isOver ? "border-accent bg-accent/5" : "border-separator/70")}>
          {column.tasks.map((t) => <SortableCard key={t.id} task={t} onOpen={() => onOpenTask(t)} />)}
          {adding && (
            <form onSubmit={(e) => { e.preventDefault(); onSubmitAdd(); }} className="rounded-[var(--radius-card)] border border-separator bg-surface p-2">
              <input autoFocus value={newTitle} onChange={(e) => setNewTitle(e.target.value)} onBlur={() => !newTitle.trim() && onCancelAdd()} placeholder="Task title…" className="w-full bg-transparent text-sm outline-none placeholder:text-faint" />
            </form>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

function SortableCard({ task, onOpen }: { task: BoardTask; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Translate.toString(transform), transition }} className={cn("cursor-grab touch-none", isDragging && "opacity-40")} {...attributes} {...listeners} onClick={onOpen}>
      <TaskCard task={task} />
    </div>
  );
}

function TaskCard({ task, dragging }: { task: BoardTask; dragging?: boolean }) {
  return (
    <div className={cn("rounded-[var(--radius-card)] border border-separator bg-surface p-3 shadow-[var(--shadow-card)]", dragging && "rotate-2 cursor-grabbing shadow-[var(--shadow-pop)]")}>
      <p className="text-sm font-medium leading-snug text-foreground">{task.title}</p>
      <div className="mt-3 flex items-center justify-between">
        {task.due ? (
          <span className="flex items-center gap-1 text-xs text-muted"><CalendarClock className="h-3.5 w-3.5" />{formatDue(task.due)}</span>
        ) : (
          <span />
        )}
        {task.assignee && <Avatar name={task.assignee.displayName} size={24} />}
      </div>
    </div>
  );
}

function TaskDetail({ ws, task, onClose, onChanged }: { ws: string; task: BoardTask; onClose: () => void; onChanged: () => void }) {
  const [title, setTitle] = useState(task.title);
  const [assigneeId, setAssigneeId] = useState(task.assignee?.id ?? "");
  const [due, setDue] = useState(task.due ?? "");
  const membersQuery = useQuery({ queryKey: ["members", ws], queryFn: () => listMembers(ws), enabled: !!ws });
  const members = membersQuery.data ?? [];

  const save = useMutation({
    mutationFn: () => apiUpdateTask(task.id, { title: title.trim(), assigneeId, due }),
    onSuccess: () => { onChanged(); onClose(); },
  });
  const remove = useMutation({
    mutationFn: () => apiDeleteTask(task.id),
    onSuccess: () => { onChanged(); onClose(); },
  });

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/30 p-6" onClick={onClose}>
      <div className="glass-strong w-full max-w-md rounded-2xl border border-separator p-5 shadow-[var(--shadow-pop)]" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Task</h2>
          <button type="button" aria-label="Close" onClick={onClose} className="cursor-pointer text-faint hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>
        <label className="mb-1 block text-xs font-medium text-muted">Title</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} className="mb-4 w-full rounded-lg border border-separator bg-surface px-3 py-2 text-sm outline-none focus:border-accent" />

        <div className="mb-4 grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted">Assignee</label>
            <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} className="w-full cursor-pointer rounded-lg border border-separator bg-surface px-2 py-2 text-sm outline-none focus:border-accent">
              <option value="">Unassigned</option>
              {members.map((m) => <option key={m.id} value={m.id}>{m.displayName}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted">Due date</label>
            <input type="date" value={due} onChange={(e) => setDue(e.target.value)} className="w-full cursor-pointer rounded-lg border border-separator bg-surface px-2 py-2 text-sm outline-none focus:border-accent" />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <button type="button" onClick={() => remove.mutate()} disabled={remove.isPending} className="flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-danger transition hover:bg-danger/10"><Trash2 className="h-4 w-4" /> Delete</button>
          <button type="button" onClick={() => save.mutate()} disabled={save.isPending || !title.trim()} className="cursor-pointer rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition hover:brightness-110 disabled:opacity-50">{save.isPending ? "Saving…" : "Save"}</button>
        </div>
      </div>
    </div>
  );
}

function formatDue(d: string): string {
  const date = new Date(d + "T00:00:00");
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
