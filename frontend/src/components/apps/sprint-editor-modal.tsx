import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { useState } from "react";
import { createSprint, updateSprint, type Sprint } from "@/lib/sprints";

export function SprintEditorModal({ ws, sprint, onClose }: { ws: string; sprint: Sprint | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState(sprint?.name ?? "");
  const [goal, setGoal] = useState(sprint?.goal ?? "");
  const [startDate, setStartDate] = useState(sprint?.startDate ? new Date(sprint.startDate).toISOString().slice(0, 10) : "");
  const [endDate, setEndDate] = useState(sprint?.endDate ? new Date(sprint.endDate).toISOString().slice(0, 10) : "");

  const save = useMutation({
    mutationFn: () => {
      const payload = {
        name: name.trim(),
        goal: goal.trim() || null,
        startDate: startDate || null,
        endDate: endDate || null,
      };
      if (sprint) {
        return updateSprint(sprint.id, payload);
      } else {
        return createSprint(ws, payload);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sprints", ws] });
      onClose();
    }
  });

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="glass-strong w-full max-w-md rounded-2xl border border-separator p-5 shadow-[var(--shadow-pop)]" onClick={(e) => e.stopPropagation()}>
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">{sprint ? "Edit Sprint" : "Create Sprint"}</h2>
          <button type="button" onClick={onClose} className="rounded p-1 text-faint hover:bg-hover hover:text-foreground transition"><X className="h-5 w-5" /></button>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Name <span className="text-danger">*</span></label>
            <input 
              autoFocus
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              className="w-full rounded-lg border border-separator bg-surface px-3 py-2 text-sm outline-none focus:border-accent" 
              placeholder="e.g. Sprint 1"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Goal</label>
            <textarea 
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              className="w-full min-h-[80px] rounded-lg border border-separator bg-surface px-3 py-2 text-sm outline-none focus:border-accent resize-y" 
              placeholder="What do we want to achieve?"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted">Start Date</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full rounded-lg border border-separator bg-surface px-3 py-2 text-sm outline-none focus:border-accent" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted">End Date</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full rounded-lg border border-separator bg-surface px-3 py-2 text-sm outline-none focus:border-accent" />
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-muted hover:text-foreground">Cancel</button>
          <button type="button" onClick={() => save.mutate()} disabled={save.isPending || !name.trim()} className="rounded-lg bg-accent px-5 py-2 text-sm font-semibold text-accent-foreground transition hover:brightness-110 disabled:opacity-50">
            {save.isPending ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
