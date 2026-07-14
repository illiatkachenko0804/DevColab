"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, FileText, Image as ImageIcon, Trash2, Upload, X } from "lucide-react";
import { useRef, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import {
  deleteFile,
  fileUrl,
  formatSize,
  listFiles,
  uploadFile,
  type ProjectFile,
} from "@/lib/files";
import { relativeTime } from "@/lib/utils";
import { usePermissions } from "@/lib/workspaces";
import { useOS } from "@/stores/os";

const isImage = (f: ProjectFile) => (f.contentType ?? "").startsWith("image/");
const isPdf = (f: ProjectFile) => (f.contentType ?? "") === "application/pdf";

export function FilesApp() {
  const ws = useOS((s) => s.activeWorkspace);
  const me = useOS((s) => s.user);
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<ProjectFile | null>(null);

  const permissions = usePermissions();
  const canManageFiles = permissions.manageFiles === true;

  const filesQuery = useQuery({ queryKey: ["files", ws], queryFn: () => listFiles(ws), enabled: !!ws });
  const files = filesQuery.data ?? [];

  const upload = useMutation({
    mutationFn: (file: File) => uploadFile(ws, file),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["files", ws] }),
  });
  const remove = useMutation({
    mutationFn: (id: string) => deleteFile(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["files", ws] }),
  });

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) upload.mutate(file);
    e.target.value = "";
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-separator px-4">
        <span className="font-semibold">Files</span>
        <span className="text-sm text-muted">· {files.length}</span>
        {canManageFiles && (
          <>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={upload.isPending}
              className="ml-auto flex cursor-pointer items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground transition hover:brightness-110 disabled:opacity-50"
            >
              <Upload className="h-4 w-4" /> {upload.isPending ? "Uploading…" : "Upload"}
            </button>
            <input ref={inputRef} type="file" hidden onChange={onPick} />
          </>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-5 no-scrollbar">
        {files.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-muted">
            <Upload className="h-9 w-9 opacity-40" />
            <p className="text-sm">No files yet. Upload a PDF, image or doc to share with the project.</p>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {files.map((f) => (
            <div key={f.id} className="group/file flex flex-col overflow-hidden rounded-[var(--radius-card)] border border-separator bg-surface shadow-[var(--shadow-card)]">
              <button type="button" onClick={() => setPreview(f)} className="flex h-28 cursor-pointer items-center justify-center overflow-hidden border-b border-separator bg-hover">
                {isImage(f) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={fileUrl(f.id)} alt={f.name} className="h-full w-full object-cover" />
                ) : (
                  <FileIcon file={f} />
                )}
              </button>
              <div className="flex items-start gap-2 p-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium" title={f.name}>{f.name}</p>
                  <p className="text-[11px] text-muted">{formatSize(f.size)} · {relativeTime(f.createdAt)}</p>
                </div>
              </div>
              <div className="flex items-center gap-1 border-t border-separator px-2 py-1.5">
                {f.uploader && <Avatar name={f.uploader.displayName} size={16} />}
                <span className="truncate text-[11px] text-muted">{f.uploader?.displayName.split(" ")[0]}</span>
                <a href={fileUrl(f.id, true)} aria-label="Download" className="ml-auto flex h-6 w-6 cursor-pointer items-center justify-center rounded text-faint hover:bg-hover hover:text-foreground"><Download className="h-3.5 w-3.5" /></a>
                {(f.uploader?.id === me?.id || canManageFiles) && canManageFiles && (
                  <button type="button" aria-label="Delete file" onClick={() => remove.mutate(f.id)} className="flex h-6 w-6 cursor-pointer items-center justify-center rounded text-faint hover:bg-danger/10 hover:text-danger"><Trash2 className="h-3.5 w-3.5" /></button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {preview && <Preview file={preview} onClose={() => setPreview(null)} />}
    </div>
  );
}

function FileIcon({ file }: { file: ProjectFile }) {
  const pdf = isPdf(file);
  return (
    <div className="flex flex-col items-center gap-1 text-muted">
      {pdf ? <FileText className="h-9 w-9 text-danger" /> : <FileText className="h-9 w-9 text-faint" />}
      <span className="text-[10px] font-mono uppercase">{(file.name.split(".").pop() ?? "file").slice(0, 5)}</span>
    </div>
  );
}

function Preview({ file, onClose }: { file: ProjectFile; onClose: () => void }) {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/50 p-6" onClick={onClose}>
      <div className="glass-strong flex max-h-full w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-separator shadow-[var(--shadow-pop)]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 border-b border-separator px-4 py-2.5">
          {isImage(file) ? <ImageIcon className="h-4 w-4 text-muted" /> : <FileText className="h-4 w-4 text-muted" />}
          <span className="truncate text-sm font-medium">{file.name}</span>
          <a href={fileUrl(file.id, true)} aria-label="Download" className="ml-auto flex h-7 w-7 items-center justify-center rounded text-faint hover:bg-hover hover:text-foreground"><Download className="h-4 w-4" /></a>
          <button type="button" aria-label="Close" onClick={onClose} className="flex h-7 w-7 cursor-pointer items-center justify-center rounded text-faint hover:bg-hover hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto bg-background/60">
          {isImage(file) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={fileUrl(file.id)} alt={file.name} className="mx-auto max-h-[70vh] object-contain" />
          ) : isPdf(file) ? (
            <iframe src={fileUrl(file.id)} title={file.name} className="h-[70vh] w-full" />
          ) : (
            <div className="flex h-48 flex-col items-center justify-center gap-2 text-muted">
              <FileText className="h-10 w-10 opacity-40" />
              <p className="text-sm">No inline preview — download to open.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
