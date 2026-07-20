"use client";

import { useRef } from "react";
import { FileUp, X } from "lucide-react";
import type { AttachmentKind } from "@/lib/api/attachments";

export type LocalFileItem = {
  id: string;
  file: File;
  kind: AttachmentKind;
  previewUrl: string;
};

type ProposalFileUploadProps = {
  label: string;
  kind: AttachmentKind;
  files: LocalFileItem[];
  onAdd: (files: File[]) => void;
  onRemove: (id: string) => void;
  accept?: string;
  multiple?: boolean;
};

export function ProposalFileUpload({
  label,
  kind,
  files,
  onAdd,
  onRemove,
  accept = ".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx",
  multiple = true,
}: ProposalFileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const kindFiles = files.filter((f) => f.kind === kind);

  return (
    <div className="block text-sm md:col-span-2">
      <span className="mb-2 block font-medium text-slate-700">{label}</span>
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
        className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-surface-muted px-4 py-8 transition hover:border-primary-400 hover:bg-primary-50/40"
      >
        <FileUp className="mb-2 h-8 w-8 text-slate-400" />
        <p className="text-sm font-medium text-slate-700">
          Nhấn để tải file lên
        </p>
        <p className="mt-1 text-xs text-slate-400">
          PDF, ảnh, Word, Excel — tối đa 15MB
        </p>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept={accept}
          multiple={multiple}
          onChange={(e) => {
            const picked = Array.from(e.target.files ?? []);
            if (picked.length) onAdd(picked);
            e.target.value = "";
          }}
        />
      </div>
      {kindFiles.length > 0 && (
        <ul className="mt-3 space-y-2">
          {kindFiles.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between rounded-xl border border-border bg-surface px-3 py-2"
            >
              <span className="truncate text-sm text-slate-700">
                {item.file.name}
              </span>
              <button
                type="button"
                onClick={() => onRemove(item.id)}
                className="rounded-lg p-1 text-slate-400 hover:bg-surface-muted hover:text-danger"
                aria-label="Xóa file"
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function createLocalFiles(
  kind: AttachmentKind,
  files: File[],
): LocalFileItem[] {
  return files.map((file) => ({
    id: `${kind}-${file.name}-${file.size}-${crypto.randomUUID()}`,
    file,
    kind,
    previewUrl: URL.createObjectURL(file),
  }));
}
