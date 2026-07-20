"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, FileText, Image as ImageIcon, Trash2, Upload, X, FolderPlus, Folder, ArrowLeft, Lock, Globe } from "lucide-react";
import { useRef, useState, useMemo } from "react";
import { Avatar } from "@/components/ui/avatar";
import {
  deleteFile,
  fileUrl,
  formatSize,
  listFiles,
  uploadFile,
  createFolder,
  type ProjectFile,
} from "@/lib/files";
import { relativeTime } from "@/lib/utils";
import { usePermissions } from "@/lib/workspaces";
import { Select } from "@/components/ui/select";
import { useOS } from "@/stores/os";

const isImage = (f: ProjectFile) => (f.contentType ?? "").startsWith("image/");
const isPdf = (f: ProjectFile) => (f.contentType ?? "") === "application/pdf";

export function FilesApp() {
  const ws = useOS((s) => s.activeWorkspace);
  const me = useOS((s) => s.user);
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  
  const [preview, setPreview] = useState<ProjectFile | null>(null);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);

  const permissions = usePermissions();
  const canManageFiles = permissions.manageFiles === true;

  const filesQuery = useQuery({ queryKey: ["files", ws], queryFn: () => listFiles(ws), enabled: !!ws });
  const allFiles = filesQuery.data ?? [];

  const currentFolder = useMemo(() => allFiles.find(f => f.id === currentFolderId) || null, [allFiles, currentFolderId]);
  
  const { folders, files } = useMemo(() => {
    const inCurrent = allFiles.filter(f => f.parentId === currentFolderId || (!f.parentId && !currentFolderId));
    return {
      folders: inCurrent.filter(f => f.isFolder).sort((a, b) => a.name.localeCompare(b.name)),
      files: inCurrent.filter(f => !f.isFolder).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    };
  }, [allFiles, currentFolderId]);

  const remove = useMutation({
    mutationFn: (id: string) => deleteFile(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["files", ws] }),
  });

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Just basic upload for inline button, or we can use the modal for advanced
      await uploadFile(ws, file, true, false, currentFolderId || undefined, "INHERIT");
      qc.invalidateQueries({ queryKey: ["files", ws] });
    }
    e.target.value = "";
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col relative">
      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-separator px-4">
        {currentFolderId && (
          <button type="button" onClick={() => setCurrentFolderId(currentFolder?.parentId || null)} className="mr-2 flex items-center justify-center h-8 w-8 rounded-lg hover:bg-hover transition">
            <ArrowLeft className="h-4 w-4" />
          </button>
        )}
        <span className="font-semibold">{currentFolder ? currentFolder.name : "Files"}</span>
        <span className="text-sm text-muted">· {folders.length + files.length} items</span>
        
        {canManageFiles && (
          <div className="ml-auto flex gap-2">
            <button
              type="button"
              onClick={() => setCreateFolderOpen(true)}
              className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-separator px-3 py-1.5 text-sm font-medium transition hover:bg-hover"
            >
              <FolderPlus className="h-4 w-4" /> <span className="hidden sm:inline">New Folder</span>
            </button>
            <button
              type="button"
              onClick={() => setUploadOpen(true)}
              className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground transition hover:brightness-110"
            >
              <Upload className="h-4 w-4" /> Upload
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-5 no-scrollbar">
        {folders.length === 0 && files.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-muted">
            <Folder className="h-9 w-9 opacity-40" />
            <p className="text-sm">Empty folder.</p>
          </div>
        )}
        
        {folders.length > 0 && (
          <div className="mb-6">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted mb-3">Folders</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {folders.map(f => (
                <div key={f.id} className="group/file flex items-center gap-3 overflow-hidden rounded-[var(--radius-card)] border border-separator bg-surface p-3 shadow-[var(--shadow-card)] hover:border-accent/50 cursor-pointer transition" onClick={() => setCurrentFolderId(f.id)}>
                  <Folder className="h-8 w-8 text-accent shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium" title={f.name}>{f.name}</p>
                    <div className="flex items-center gap-1 text-[11px] text-muted mt-0.5">
                      {f.accessType === "PRIVATE" ? <Lock className="h-3 w-3" /> : (f.accessType === "PUBLIC" ? <Globe className="h-3 w-3" /> : null)}
                      <span>{f.accessType}</span>
                    </div>
                  </div>
                  {(f.uploader?.id === me?.id || canManageFiles) && canManageFiles && (
                    <button type="button" aria-label="Delete folder" onClick={(e) => { e.stopPropagation(); remove.mutate(f.id); }} className="flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded text-faint hover:bg-danger/10 hover:text-danger opacity-0 group-hover/file:opacity-100 transition"><Trash2 className="h-3.5 w-3.5" /></button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {files.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted mb-3">Files</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {files.map((f) => (
                <div key={f.id} className="group/file flex flex-col overflow-hidden rounded-[var(--radius-card)] border border-separator bg-surface shadow-[var(--shadow-card)]">
                  <button type="button" onClick={() => setPreview(f)} className="flex h-28 cursor-pointer items-center justify-center overflow-hidden border-b border-separator bg-hover">
                    {isImage(f) ? (
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
        )}
      </div>

      {preview && <Preview file={preview} onClose={() => setPreview(null)} />}
      {createFolderOpen && <CreateFolderDialog ws={ws} parentId={currentFolderId} onClose={() => setCreateFolderOpen(false)} onCreated={() => qc.invalidateQueries({ queryKey: ["files", ws] })} />}
      {uploadOpen && <UploadFileDialog ws={ws} parentId={currentFolderId} onClose={() => setUploadOpen(false)} onUploaded={() => qc.invalidateQueries({ queryKey: ["files", ws] })} />}
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

function CreateFolderDialog({ ws, parentId, onClose, onCreated }: { ws: string; parentId: string | null; onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [access, setAccess] = useState(parentId ? "INHERIT" : "PUBLIC");

  const create = useMutation({
    mutationFn: () => createFolder(ws, name, parentId || undefined, access),
    onSuccess: () => { onCreated(); onClose(); }
  });

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/50 p-6">
      <div className="w-full max-w-md rounded-xl border border-separator bg-surface p-5 shadow-[var(--shadow-modal)]">
        <h2 className="mb-4 text-lg font-semibold">Create Folder</h2>
        <div className="space-y-4">
          <Field label="Folder Name">
            <input autoFocus value={name} onChange={e => setName(e.target.value)} className="w-full rounded border border-separator bg-transparent px-3 py-1.5 text-sm outline-none focus:border-accent" />
          </Field>
          <Field label="Access">
            <Select 
              value={access} 
              onChange={setAccess}
              options={[
                { label: "Public (everyone in project)", value: "PUBLIC" },
                { label: "Private (only you)", value: "PRIVATE" },
                ...(parentId ? [{ label: "Inherit (same as parent folder)", value: "INHERIT" }] : [])
              ]}
            />
          </Field>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg px-4 py-1.5 text-sm font-medium hover:bg-hover">Cancel</button>
          <button type="button" onClick={() => create.mutate()} disabled={create.isPending || !name.trim()} className="rounded-lg bg-accent px-4 py-1.5 text-sm font-medium text-accent-foreground hover:brightness-110 disabled:opacity-50">Create</button>
        </div>
      </div>
    </div>
  );
}

function UploadFileDialog({ ws, parentId, onClose, onUploaded }: { ws: string; parentId: string | null; onClose: () => void; onUploaded: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [access, setAccess] = useState(parentId ? "INHERIT" : "PUBLIC");

  const [uploading, setUploading] = useState(false);

  const handleUpload = async () => {
    if (!file) return;
    try {
      setUploading(true);
      await uploadFile(ws, file, true, false, parentId || undefined, access);
      onUploaded();
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/50 p-6">
      <div className="w-full max-w-md rounded-xl border border-separator bg-surface p-5 shadow-[var(--shadow-modal)]">
        <h2 className="mb-4 text-lg font-semibold">Upload File</h2>
        <div className="space-y-4">
          <div className="rounded-lg border border-dashed border-separator p-6 text-center hover:bg-hover cursor-pointer transition" onClick={() => inputRef.current?.click()}>
            <input type="file" hidden ref={inputRef} onChange={e => setFile(e.target.files?.[0] || null)} />
            <Upload className="mx-auto h-8 w-8 text-faint mb-2" />
            <p className="text-sm font-medium">{file ? file.name : "Click to select a file"}</p>
            {file && <p className="text-xs text-muted mt-1">{formatSize(file.size)}</p>}
          </div>
          <Field label="Access">
            <Select 
              value={access} 
              onChange={setAccess}
              options={[
                { label: "Public (everyone in project)", value: "PUBLIC" },
                { label: "Private (only you)", value: "PRIVATE" },
                ...(parentId ? [{ label: "Inherit (same as parent folder)", value: "INHERIT" }] : [])
              ]}
            />
          </Field>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={uploading} className="rounded-lg px-4 py-1.5 text-sm font-medium hover:bg-hover">Cancel</button>
          <button type="button" onClick={handleUpload} disabled={uploading || !file} className="rounded-lg bg-accent px-4 py-1.5 text-sm font-medium text-accent-foreground hover:brightness-110 disabled:opacity-50">{uploading ? "Uploading..." : "Upload"}</button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-muted">{label}</label>
      {children}
    </div>
  );
}
