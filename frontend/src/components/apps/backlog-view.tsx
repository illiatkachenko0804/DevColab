import { DndContext, DragOverlay, PointerSensor, closestCorners, useSensor, useSensors, useDroppable, type DragEndEvent, type DragStartEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, CheckSquare, Bug, Bookmark, Zap, ArrowUp, ArrowRight, ArrowDown, AlertCircle, Play, Check, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { updateTask as apiUpdateTask, type BoardTask } from "@/lib/board";
import { getSprints, startSprint, completeSprint, type Sprint } from "@/lib/sprints";
import { SprintEditorModal } from "./sprint-editor-modal";
import { usePermissions } from "@/lib/workspaces";
import { cn } from "@/lib/utils";

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

function BacklogTaskRow({ task, onOpen, disabled }: { task: BoardTask; onOpen: () => void; disabled?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id, disabled });
  
  return (
    <div 
      ref={setNodeRef} 
      style={{ transform: CSS.Translate.toString(transform), transition }} 
      className={cn("flex cursor-grab items-center gap-3 border-b border-separator bg-surface p-2.5 hover:bg-hover transition-colors", isDragging && "opacity-50 z-10")}
      {...attributes} 
      {...listeners} 
      onClick={onOpen}
    >
      <TypeIcon type={task.type} />
      <span className="w-16 text-xs font-semibold text-muted">{task.taskKey}</span>
      <span className="flex-1 truncate text-sm font-medium text-foreground">{task.title}</span>
      
      <div className="flex items-center gap-3 shrink-0">
        {task.storyPoints != null && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-separator/50 px-1.5 text-xs font-semibold text-faint">
            {task.storyPoints}
          </span>
        )}
        <PriorityIcon priority={task.priority} />
        {task.assignee ? (
          <Avatar name={task.assignee.displayName} url={task.assignee.avatarUrl} size={24} />
        ) : (
          <div className="h-6 w-6 rounded-full border border-dashed border-separator flex items-center justify-center bg-surface">
            <span className="text-[10px] text-faint">?</span>
          </div>
        )}
      </div>
    </div>
  );
}

function SprintSection({ sprint, tasks, onOpenTask, onStart, onComplete, onEditSprint, onCreateTask, canManageTasks, canManageSprints }: { sprint: Sprint | null; tasks: BoardTask[]; onOpenTask: (t: BoardTask) => void; onStart?: () => void; onComplete?: () => void; onEditSprint?: () => void; onCreateTask: () => void; canManageTasks?: boolean; canManageSprints?: boolean }) {
  const id = sprint ? sprint.id : "backlog";
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div className="mb-6 rounded-xl border border-separator bg-surface shadow-sm overflow-hidden">
      <div className="flex items-center justify-between bg-sidebar px-4 py-3 border-b border-separator">
        <div className="flex items-center gap-3">
          <h3 
            className={cn("text-sm font-semibold", sprint && canManageSprints && "cursor-pointer hover:underline decoration-separator")} 
            onClick={() => { if (sprint && onEditSprint && canManageSprints) onEditSprint(); }}
          >
            {sprint ? sprint.name : "Backlog"}
          </h3>
          <span className="rounded-full bg-separator/50 px-2 py-0.5 text-xs text-muted">{tasks.length} issues</span>
          {sprint?.goal && <span className="text-xs italic text-faint ml-2 hidden sm:inline-block">— {sprint.goal}</span>}
        </div>
        <div className="flex items-center gap-2">
          {sprint && sprint.status === "DRAFT" && (
            <button onClick={onStart} className="flex items-center gap-1.5 rounded-lg bg-surface px-3 py-1.5 text-xs font-semibold border border-separator hover:border-accent hover:text-accent transition">
              <Play className="h-3.5 w-3.5" /> Start Sprint
            </button>
          )}
          {sprint && sprint.status === "ACTIVE" && canManageSprints && (
            <button onClick={onComplete} className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground hover:brightness-110 transition">
              <Check className="h-3.5 w-3.5" /> Complete Sprint
            </button>
          )}
          {canManageTasks && (
            <button onClick={onCreateTask} className="flex items-center gap-1.5 rounded-lg bg-surface px-3 py-1.5 text-xs font-semibold border border-separator hover:border-accent hover:text-accent transition ml-2">
              <Plus className="h-3.5 w-3.5" /> Create Issue
            </button>
          )}
        </div>
      </div>
      
      <div ref={setNodeRef} className={cn("min-h-[50px] transition-colors", isOver && "bg-accent/5")}>
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.length > 0 ? (
            tasks.map(t => <BacklogTaskRow key={t.id} task={t} onOpen={() => onOpenTask(t)} disabled={!canManageTasks} />)
          ) : (
            <div className="flex items-center justify-center p-6 text-sm text-faint italic border-b border-separator/30">
              Drop issues here
            </div>
          )}
        </SortableContext>
      </div>
    </div>
  );
}

export function BacklogView({ ws, allTasks, onOpenTask, onTaskChanged, onCreateTaskInSprint }: { ws: string; allTasks: BoardTask[]; onOpenTask: (t: BoardTask) => void; onTaskChanged: () => void; onCreateTaskInSprint: (sprintId: string) => void }) {
  const qc = useQueryClient();
  const sprintsQuery = useQuery({ queryKey: ["sprints", ws], queryFn: () => getSprints(ws), enabled: !!ws });
  const sprints = sprintsQuery.data ?? [];
  const permissions = usePermissions();
  const canManageTasks = permissions.manageTasks === true;
  const canManageSprints = permissions.manageSprints === true;


  const [activeId, setActiveId] = useState<string | null>(null);
  const [editingSprint, setEditingSprint] = useState<{ isNew: boolean, sprint: Sprint | null } | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const updateTaskSprint = useMutation({
    mutationFn: (v: { taskId: string; sprintId: string | null }) => apiUpdateTask(v.taskId, { sprintId: v.sprintId || undefined }),
    onSuccess: () => {
      onTaskChanged();
      qc.invalidateQueries({ queryKey: ["sprints", ws] });
    }
  });

  const startSprintMut = useMutation({
    mutationFn: (id: string) => startSprint(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sprints", ws] })
  });

  const completeSprintMut = useMutation({
    mutationFn: (id: string) => completeSprint(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sprints", ws] })
  });

  const onDragStart = (e: DragStartEvent) => {
    setActiveId(e.active.id as string);
  };

  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;

    // determine if over is a sprint container or a task
    let targetSprintId: string | null = null;
    
    // If dropped on a sprint container directly
    if (over.id === "backlog") targetSprintId = null;
    else if (sprints.some(s => s.id === over.id)) targetSprintId = over.id as string;
    else {
      // If dropped on another task, find that task's sprint
      const targetTask = allTasks.find(t => t.id === over.id);
      if (targetTask) targetSprintId = targetTask.sprintId;
    }

    const draggedTask = allTasks.find(t => t.id === active.id);
    if (!draggedTask) return;

    // If sprint changed, update it. Note: true order in backlog isn't persisted yet via `position`, 
    // but we support moving across sprints correctly.
    if (draggedTask.sprintId !== targetSprintId) {
      updateTaskSprint.mutate({ taskId: draggedTask.id, sprintId: targetSprintId });
    }
  };

  const tasksBySprint = useMemo(() => {
    const map = new Map<string | null, BoardTask[]>();
    map.set(null, []);
    sprints.forEach(s => map.set(s.id, []));
    
    allTasks.forEach(t => {
      const arr = map.get(t.sprintId || null) || map.get(null)!;
      arr.push(t);
    });
    
    return map;
  }, [allTasks, sprints]);

  const activeTask = activeId ? allTasks.find(t => t.id === activeId) : null;

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 max-w-5xl mx-auto w-full no-scrollbar">
      <div className="mb-6 flex justify-end">
        {canManageSprints && (
          <button 
            onClick={() => setEditingSprint({ isNew: true, sprint: null })}
            className="rounded-lg bg-surface px-4 py-2 text-sm font-semibold border border-separator hover:border-accent hover:text-accent transition shadow-sm"
          >
            Create Sprint
          </button>
        )}
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        {sprints.filter(s => s.status !== "COMPLETED").map(sprint => (
          <SprintSection 
            key={sprint.id} 
            sprint={sprint} 
            tasks={tasksBySprint.get(sprint.id) || []} 
            onOpenTask={onOpenTask}
            onStart={() => startSprintMut.mutate(sprint.id)}
            onComplete={() => completeSprintMut.mutate(sprint.id)}
            onEditSprint={() => setEditingSprint({ isNew: false, sprint })}
            onCreateTask={() => onCreateTaskInSprint(sprint.id)}
            canManageTasks={canManageTasks}
            canManageSprints={canManageSprints}

          />
        ))}

        <div className="mt-12">
          <SprintSection 
            sprint={null} 
            tasks={tasksBySprint.get(null) || []} 
            onOpenTask={onOpenTask} 
            onCreateTask={() => onCreateTaskInSprint("")}
            canManageTasks={canManageTasks}
            canManageSprints={canManageSprints}

          />
        </div>

        <DragOverlay>
          {activeTask ? (
            <div className="opacity-90 shadow-[var(--shadow-pop)] ring-1 ring-accent">
              <BacklogTaskRow task={activeTask} onOpen={() => {}} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {editingSprint && <SprintEditorModal ws={ws} sprint={editingSprint.sprint} onClose={() => setEditingSprint(null)} />}
    </div>
  );
}
