import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Tag, X } from "lucide-react";
import { useState } from "react";
import { getLabels, createLabel, type Label } from "@/lib/labels";
import { cn } from "@/lib/utils";

export function LabelPicker({ ws, selectedLabelIds, onToggleLabel }: { ws: string; selectedLabelIds: string[]; onToggleLabel: (labelId: string) => void }) {
  const qc = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newLabelName, setNewLabelName] = useState("");
  const [newLabelColor, setNewLabelColor] = useState("#3b82f6");

  const labelsQuery = useQuery({ queryKey: ["labels", ws], queryFn: () => getLabels(ws), enabled: !!ws });
  const labels = labelsQuery.data ?? [];

  const create = useMutation({
    mutationFn: () => createLabel(ws, newLabelName.trim(), newLabelColor),
    onSuccess: (newLabel) => {
      qc.invalidateQueries({ queryKey: ["labels", ws] });
      setIsCreating(false);
      setNewLabelName("");
      onToggleLabel(newLabel.id);
    }
  });

  return (
    <div className="relative">
      <button 
        type="button" 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center rounded-full bg-surface border border-dashed border-separator h-6 px-3 hover:border-accent hover:text-accent transition text-xs font-medium text-muted"
      >
        <Plus className="h-3 w-3 mr-1" /> Add Label
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-xl border border-separator bg-surface p-3 shadow-[var(--shadow-pop)] glass-strong">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted">Labels</span>
            <button onClick={() => setIsOpen(false)} className="rounded p-1 text-faint hover:bg-hover hover:text-foreground"><X className="h-3.5 w-3.5" /></button>
          </div>

          <div className="mb-3 flex flex-col gap-1.5 max-h-48 overflow-y-auto no-scrollbar">
            {labels.map(l => (
              <label key={l.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-hover transition">
                <input 
                  type="checkbox" 
                  checked={selectedLabelIds.includes(l.id)} 
                  onChange={() => onToggleLabel(l.id)} 
                  className="rounded border-separator text-accent focus:ring-accent"
                />
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium" style={{ backgroundColor: `${l.color}20`, color: l.color }}>
                  <Tag className="h-3 w-3" /> {l.name}
                </div>
              </label>
            ))}
            {labels.length === 0 && <span className="text-xs text-faint px-2 italic">No labels yet</span>}
          </div>

          {isCreating ? (
            <div className="border-t border-separator pt-3 flex flex-col gap-2">
              <input 
                autoFocus
                value={newLabelName}
                onChange={(e) => setNewLabelName(e.target.value)}
                placeholder="Label name"
                className="w-full rounded border border-separator bg-surface px-2 py-1 text-xs outline-none focus:border-accent"
              />
              <div className="flex gap-2">
                <input 
                  type="color" 
                  value={newLabelColor}
                  onChange={(e) => setNewLabelColor(e.target.value)}
                  className="h-6 w-8 cursor-pointer rounded border border-separator p-0 outline-none"
                />
                <button 
                  onClick={() => create.mutate()}
                  disabled={!newLabelName.trim() || create.isPending}
                  className="flex-1 rounded bg-accent px-2 py-1 text-xs font-semibold text-accent-foreground disabled:opacity-50"
                >
                  Create
                </button>
              </div>
            </div>
          ) : (
            <button 
              onClick={() => setIsCreating(true)}
              className="w-full rounded border border-dashed border-separator py-1.5 text-xs font-medium text-muted hover:border-accent hover:text-accent transition"
            >
              Create new label
            </button>
          )}
        </div>
      )}
    </div>
  );
}
