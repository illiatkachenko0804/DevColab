import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { useState } from "react";
import { createTask as apiCreateTask, type BoardTask } from "@/lib/board";
import { listMembers } from "@/lib/members";
import { getSprints } from "@/lib/sprints";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Select } from "@/components/ui/select";

export function CreateTaskModal({ ws, columnId, initialSprintId, onClose, onCreated }: { ws: string; columnId: string; initialSprintId?: string; onClose: () => void; onCreated: (t: BoardTask) => void }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"TASK" | "BUG" | "STORY" | "EPIC">("TASK");
  const [priority, setPriority] = useState<"LOW" | "MEDIUM" | "HIGH" | "URGENT">("MEDIUM");
  const [assigneeId, setAssigneeId] = useState("");
  const [sprintId, setSprintId] = useState(initialSprintId ?? "");

  const membersQuery = useQuery({ queryKey: ["members", ws], queryFn: () => listMembers(ws), enabled: !!ws });
  const sprintsQuery = useQuery({ queryKey: ["sprints", ws], queryFn: () => getSprints(ws), enabled: !!ws });

  const members = membersQuery.data ?? [];
  const sprints = sprintsQuery.data ?? [];

  const create = useMutation({
    mutationFn: () => apiCreateTask(columnId, {
      title: title.trim(),
      description: description.trim() || undefined,
      type,
      priority,
      assigneeId: assigneeId || undefined,
      sprintId: sprintId || undefined
    }),
    onSuccess: (task) => {
      qc.invalidateQueries({ queryKey: ["board", ws] });
      onCreated(task);
    }
  });

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="glass-strong w-full max-w-lg rounded-2xl border border-separator p-5 shadow-[var(--shadow-pop)]" onClick={(e) => e.stopPropagation()}>
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Create Issue</h2>
          <button type="button" onClick={onClose} className="rounded p-1 text-faint hover:bg-hover hover:text-foreground transition"><X className="h-5 w-5" /></button>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Title <span className="text-danger">*</span></label>
            <input 
              autoFocus
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              className="w-full rounded-lg border border-separator bg-surface px-3 py-2 text-sm outline-none focus:border-accent" 
              placeholder="What needs to be done?"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Description</label>
            <RichTextEditor 
              initialValue={description}
              onSave={(val) => setDescription(val)}
              onCancel={undefined}
              placeholder="Add details..."
              minHeight="80px"
              members={members}
              saveLabel="Done"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted">Type</label>
              <Select 
                value={type} 
                onChange={(val) => setType(val as any)}
                options={[
                  { label: "Task", value: "TASK" },
                  { label: "Bug", value: "BUG" },
                  { label: "Story", value: "STORY" },
                  { label: "Epic", value: "EPIC" }
                ]}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted">Priority</label>
              <Select 
                value={priority} 
                onChange={(val) => setPriority(val as any)}
                options={[
                  { label: "Urgent", value: "URGENT" },
                  { label: "High", value: "HIGH" },
                  { label: "Medium", value: "MEDIUM" },
                  { label: "Low", value: "LOW" }
                ]}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted">Assignee</label>
              <Select 
                value={assigneeId} 
                onChange={(val) => setAssigneeId(val)}
                options={[
                  { label: "Unassigned", value: "" },
                  ...members.map((m) => ({ label: m.displayName, value: m.id }))
                ]}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted">Sprint</label>
              <Select 
                value={sprintId} 
                onChange={(val) => setSprintId(val)}
                options={[
                  { label: "Backlog (No sprint)", value: "" },
                  ...sprints.map((s) => ({ label: `${s.name} ${s.status === "ACTIVE" ? "(Active)" : ""}`, value: s.id }))
                ]}
              />
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-muted hover:text-foreground">Cancel</button>
          <button type="button" onClick={() => create.mutate()} disabled={create.isPending || !title.trim()} className="rounded-lg bg-accent px-5 py-2 text-sm font-semibold text-accent-foreground transition hover:brightness-110 disabled:opacity-50">
            {create.isPending ? "Creating..." : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}
