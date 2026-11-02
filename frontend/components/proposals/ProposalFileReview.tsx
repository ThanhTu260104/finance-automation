"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Download, FileSpreadsheet, FileText, X } from "lucide-react";
import {
  attachmentFullUrl,
  type ProposalAttachment,
} from "@/lib/api/attachments";
import type { LocalFileItem } from "@/components/proposals/ProposalFileUpload";
import { canPreviewSpreadsheet } from "@/components/proposals/ExcelPreview";
import { SpreadsheetPreview } from "@/components/proposals/SpreadsheetPreview";
import {
  canPreviewDocx,
  DocxPreview,
} from "@/components/proposals/DocxPreview";
import { cn } from "@/lib/utils/cn";
import { PdfPreview } from "@/components/proposals/PdfPreview";

const KIND_LABELS: Record<string, string> = {
  CONTRACT: "Hợp đồng / Báo giá",
  INVOICE: "Hóa đơn tài chính",
  CONTENT: "Nội dung đính kèm",
};

type ReviewItem = {
  id: string;
  name: string;
  url: string;
  mimeType: string;
  kind: string;
  file?: File;
};

type ProposalFileReviewProps = {
  localFiles?: LocalFileItem[];
  attachments?: ProposalAttachment[];
  className?: string;
};

function isImage(mime: string) {
  return mime.startsWith("image/");
}

function isPdf(mime: string) {
  return mime === "application/pdf";
}

function canFullscreenPreview(mime: string, name: string) {
  return (
    isImage(mime) ||
    isPdf(mime) ||
    canPreviewDocx(mime, name) ||
    canPreviewSpreadsheet(mime, name)
  );
}

function FileTypeIcon({ mime, name }: { mime: string; name: string }) {
  if (canPreviewSpreadsheet(mime, name)) {
    return <FileSpreadsheet className="h-5 w-5 shrink-0 text-emerald-600" />;
  }
  return <FileText className="h-5 w-5 shrink-0 text-slate-500" />;
}

export function ProposalFileReview({
  localFiles = [],
  attachments = [],
  className,
}: ProposalFileReviewProps) {
  const items = useMemo<ReviewItem[]>(() => {
    const fromLocal = localFiles.map((f) => ({
      id: f.id,
      name: f.file.name,
      url: f.previewUrl,
      mimeType: f.file.type,
      kind: f.kind,
      file: f.file,
    }));
    const fromServer = attachments.map((a) => ({
      id: a.id,
      name: a.originalName,
      url: attachmentFullUrl(a.urlPath, a.createdAt),
      mimeType: a.mimeType,
      kind: a.kind,
    }));
    return [...fromLocal, ...fromServer];
  }, [localFiles, attachments]);

  const [previewModalId, setPreviewModalId] = useState<string | null>(null);
  const previewModalItem = items.find((item) => item.id === previewModalId) ?? null;

  useEffect(() => {
    if (!previewModalItem) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPreviewModalId(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [previewModalItem]);

  if (items.length === 0) {
    return (
      <div
        className={cn(
          "flex min-h-[200px] items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4",
          className,
        )}
      >
        <div className="text-center text-slate-400">
          <FileText className="mx-auto mb-2 h-10 w-10 opacity-50" />
          <p className="text-sm">Chưa có file để xem trước</p>
        </div>
      </div>
    );
  }

  const openItem = (item: ReviewItem) => {
    if (canFullscreenPreview(item.mimeType, item.name)) {
      setPreviewModalId(item.id);
      return;
    }
    window.open(item.url, "_blank", "noopener,noreferrer");
  };

  return (
    <>
      <div
        className={cn(
          "overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm",
          className,
        )}
      >
        <div className="border-b border-primary-100 bg-gradient-to-r from-primary-50 to-sky-50 px-3 py-2.5">
          <h3 className="text-base font-semibold text-slate-800">
            Xem trước tài liệu
            <span className="font-normal text-slate-600"> · {items.length} file</span>
          </h3>
        </div>

        <ul className="divide-y divide-slate-100">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => openItem(item)}
                className="flex w-full items-start gap-3 px-3 py-3 text-left transition hover:bg-primary-50/60"
              >
                <FileTypeIcon mime={item.mimeType} name={item.name} />
                <div className="min-w-0 flex-1">
                  <p className="break-all text-base font-medium text-slate-800">{item.name}</p>
                  <p className="mt-0.5 text-sm text-slate-500">
                    {KIND_LABELS[item.kind] ?? item.kind}
                  </p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {previewModalItem && typeof document !== "undefined"
        ? createPortal(
            <div
              className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/75 p-0 backdrop-blur-sm"
              role="dialog"
              aria-modal="true"
              aria-label={`Xem trước ${previewModalItem.name}`}
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) setPreviewModalId(null);
              }}
            >
              <div className="flex h-[100dvh] w-full flex-col overflow-hidden bg-white">
                <div className="flex flex-none items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold text-slate-800">
                      {previewModalItem.name}
                    </p>
                    <p className="text-sm text-slate-500">
                      {KIND_LABELS[previewModalItem.kind] ?? previewModalItem.kind}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <a
                      href={previewModalItem.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                    >
                      <Download className="h-4 w-4" />
                      Tải file
                    </a>
                    <button
                      type="button"
                      onClick={() => setPreviewModalId(null)}
                      className="inline-flex items-center justify-center rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                      aria-label="Đóng xem trước"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>
                <div className="min-h-0 flex-1 overflow-hidden bg-slate-100">
                  {isImage(previewModalItem.mimeType) ? (
                    <div className="flex h-full items-center justify-center overflow-auto p-4">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={previewModalItem.url}
                        alt={previewModalItem.name}
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                  ) : isPdf(previewModalItem.mimeType) ? (
                    <PdfPreview
                      url={previewModalItem.url}
                      file={previewModalItem.file}
                      className="h-full"
                    />
                  ) : canPreviewDocx(previewModalItem.mimeType, previewModalItem.name) ? (
                    <DocxPreview
                      url={previewModalItem.url}
                      file={previewModalItem.file}
                      className="!h-full"
                    />
                  ) : (
                    <SpreadsheetPreview
                      url={previewModalItem.url}
                      file={previewModalItem.file}
                      fileName={previewModalItem.name}
                      className="!h-full min-h-0"
                    />
                  )}
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
