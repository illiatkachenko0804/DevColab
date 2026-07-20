import { useRef, useState } from "react";
import { ImageIcon, Pencil, Trash2 } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { fileUrl, uploadFile } from "@/lib/files";

export function EditableAvatar({
  name,
  url,
  workspaceId,
  disabled,
  size = 72,
  onChange,
}: {
  name: string;
  url: string | null;
  workspaceId?: string | null;
  disabled?: boolean;
  size?: number;
  onChange: (url: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const canUpload = !!workspaceId && !disabled && !uploading;

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !workspaceId) return;
    try {
      setUploading(true);
      const uploaded = await uploadFile(workspaceId, file, true, true);
      onChange(fileUrl(uploaded.id));
      setOpen(false);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="relative inline-flex">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className="group relative cursor-pointer disabled:cursor-default"
        aria-label="Edit image"
      >
        <Avatar name={name} url={url} size={size} />
        {!disabled && (
          <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/35 opacity-0 transition group-hover:opacity-100">
            <Pencil className="h-4 w-4 text-white" />
          </span>
        )}
      </button>
      <input ref={inputRef} type="file" className="hidden" accept="image/*" onChange={handleUpload} />
      {open && !disabled && (
        <div className="absolute left-0 top-full z-30 mt-2 w-44 rounded-lg border border-separator bg-surface p-1 shadow-[var(--shadow-card)]">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={!canUpload}
            className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm hover:bg-hover disabled:cursor-default disabled:opacity-50"
          >
            <ImageIcon className="h-4 w-4" />
            {uploading ? "Uploading..." : url ? "Edit image" : "Set image"}
          </button>
          {url && (
            <button
              type="button"
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
              className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-danger hover:bg-danger/10"
            >
              <Trash2 className="h-4 w-4" />
              Delete image
            </button>
          )}
        </div>
      )}
    </div>
  );
}
