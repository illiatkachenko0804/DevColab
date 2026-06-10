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
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CalendarClock, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Avatar } from "@/components/ui/avatar";
import { userById, wsBoard, type Column, type Task } from "@/lib/mock";
import { cn } from "@/lib/utils";
import { useOS } from "@/stores/os";

function TaskCard({ task, dragging }: { task: Task; dragging?: boolean }) {
  return (
    <div className={cn("rounded-[var(--radius-card)] border border-separator bg-surface p-3 shadow-[var(--shadow-card)]", dragging && "rotate-2 cursor-grabbing shadow-[var(--shadow-pop)]")}>
      <div className="mb-2 flex flex-wrap gap-1.5">
        {task.labels.map((l) => (
          <span key={l.text} className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white" style={{ background: l.color }}>{l.text}</span>
        ))}
      </div>
      <p className="text-sm font-medium leading-snug text-foreground">{task.title}</p>
      <div className="mt-3 flex items-center justify-between">
        {task.due ? (
          <span className="flex items-center gap-1 text-xs text-muted"><CalendarClock className="h-3.5 w-3.5" />{task.due}</span>
        ) : (
          <span />
        )}
        {task.assigneeId && <Avatar name={userById(task.assigneeId).name} size={24} />}
      </div>
    </div>
  );
}

function SortableCard({ task }: { task: Task }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Translate.toString(transform), transition }} className={cn("cursor-grab touch-none", isDragging && "opacity-40")} {...attributes} {...listeners}>
      <TaskCard task={task} />
    </div>
  );
}

function ColumnView({ column, tasks }: { column: Column; tasks: Record<string, Task> }) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  const accent = column.name === "Done" ? "var(--success)" : column.name === "In Progress" ? "var(--app-projects)" : "var(--faint)";
  // Guard the single render where workspace just changed (old ids, new task map).
  const ids = column.taskIds.filter((id) => tasks[id]);
  return (
    <div className="flex h-full min-w-[250px] flex-1 flex-col">
      <div className="mb-2 flex shrink-0 items-center gap-2 px-1">
        <span className="h-2 w-2 rounded-full" style={{ background: accent }} />
        <h3 className="text-sm font-semibold">{column.name}</h3>
        <span className="rounded-full bg-hover px-1.5 text-xs text-muted">{column.taskIds.length}</span>
        <button type="button" aria-label="Add task" className="ml-auto cursor-pointer text-faint hover:text-foreground"><Plus className="h-4 w-4" /></button>
      </div>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        {/* Full-height border; cards scroll inside the column, not the whole board. */}
        <div ref={setNodeRef} className={cn("flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto rounded-xl border border-dashed p-2 no-scrollbar transition-colors", isOver ? "border-accent bg-accent/5" : "border-separator/70")}>
          {ids.map((id) => (
            <SortableCard key={id} task={tasks[id]} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

export function KanbanApp() {
  const ws = useOS((s) => s.activeWorkspace);
  const board = wsBoard(ws);
  const [columns, setColumns] = useState<Column[]>(board.columns);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  useEffect(() => setMounted(true), []);

  // Reset board when the project changes.
  useEffect(() => {
    setColumns(wsBoard(ws).columns.map((c) => ({ ...c, taskIds: [...c.taskIds] })));
  }, [ws]);

  const tasks = board.tasks;
  const findColumn = (id: string) => columns.find((c) => c.id === id) ?? columns.find((c) => c.taskIds.includes(id));

  const onDragOver = (e: DragOverEvent) => {
    const { active, over } = e;
    if (!over) return;
    const from = findColumn(active.id as string);
    const to = findColumn(over.id as string);
    if (!from || !to || from.id === to.id) return;
    setColumns((cols) =>
      cols.map((c) => {
        if (c.id === from.id) return { ...c, taskIds: c.taskIds.filter((t) => t !== active.id) };
        if (c.id === to.id) {
          const overIndex = c.taskIds.indexOf(over.id as string);
          const idx = overIndex >= 0 ? overIndex : c.taskIds.length;
          const next = [...c.taskIds];
          next.splice(idx, 0, active.id as string);
          return { ...c, taskIds: next };
        }
        return c;
      }),
    );
  };

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    setActiveId(null);
    if (!over) return;
    const col = findColumn(active.id as string);
    if (!col) return;
    const oldIndex = col.taskIds.indexOf(active.id as string);
    const newIndex = col.taskIds.indexOf(over.id as string);
    if (oldIndex !== newIndex && newIndex >= 0) {
      setColumns((cols) => cols.map((c) => (c.id === col.id ? { ...c, taskIds: arrayMove(c.taskIds, oldIndex, newIndex) } : c)));
    }
  };

  const taskCount = Object.keys(tasks).length;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-separator px-4">
        <span className="font-semibold">{board.name}</span>
        <span className="text-sm text-muted">· {taskCount} tasks</span>
        <button type="button" className="ml-auto flex cursor-pointer items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground transition hover:brightness-110">
          <Plus className="h-4 w-4" /> New task
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-x-auto p-4 no-scrollbar">
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={(e: DragStartEvent) => setActiveId(e.active.id as string)} onDragOver={onDragOver} onDragEnd={onDragEnd}>
          <div className="flex h-full gap-4">
            {columns.map((c) => (
              <ColumnView key={c.id} column={c} tasks={tasks} />
            ))}
          </div>
          {/* Portal to <body> so the overlay isn't offset by the window's CSS transform. */}
          {mounted
            ? createPortal(
                <DragOverlay>{activeId && tasks[activeId] ? <TaskCard task={tasks[activeId]} dragging /> : null}</DragOverlay>,
                document.body,
              )
            : null}
        </DndContext>
      </div>
    </div>
  );
}
