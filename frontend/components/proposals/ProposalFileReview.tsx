"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Download, FileText, Maximize2, X } from "lucide-react";
import {
  attachmentFullUrl,
  type ProposalAttachment,
} from "@/lib/api/attachments";
import type { LocalFileItem } from "@/components/proposals/ProposalFileUpload";
import { canPreviewSpreadsheet, ExcelPreview } from "@/components/proposals/ExcelPreview";
import { cn } from "@/lib/utils/cn";

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

  const [activeId, setActiveId] = useState<string | null>(null);
  const [excelModalId, setExcelModalId] = useState<string | null>(null);
  const active = items.find((i) => i.id === activeId) ?? items[0] ?? null;
  const excelModalItem = items.find((item) => item.id === excelModalId) ?? null;

  useEffect(() => {
    if (!excelModalItem) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setExcelModalId(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [excelModalItem]);

  if (items.length === 0) {
    return (
      <div
        className={cn(
          "flex min-h-[420px] items-center justify-center rounded-2xl border border-dashed border-border bg-surface-muted",
          className,
        )}
      >
        <div className="text-center text-slate-400">
          <FileText className="mx-auto mb-3 h-12 w-12 opacity-50" />
          <p className="text-sm">Chưa có file để xem trước</p>
          <p className="mt-1 text-xs">
            Tải hợp đồng, hóa đơn hoặc file nội dung để review tại đây
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-border bg-surface",
        className,
      )}
    >
      <div className="border-b border-border bg-surface-muted px-4 py-3">
        <h3 className="text-base font-semibold text-slate-800">
          Xem trước tài liệu
        </h3>
        <p className="text-xs text-slate-500">
          {items.length} file — chọn file bên dưới để xem chi tiết
        </p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-border p-3">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              setActiveId(item.id);
              if (canPreviewSpreadsheet(item.mimeType, item.name)) {
                setExcelModalId(item.id);
              }
            }}
            className={cn(
              "rounded-xl border px-3 py-2 text-left text-xs transition",
              active?.id === item.id
                ? "border-primary-500 bg-primary-50 text-primary-800"
                : "border-border bg-surface text-slate-600 hover:bg-surface-muted",
            )}
          >
            <span className="block font-medium">{item.name}</span>
            <span className="text-slate-400">
              {KIND_LABELS[item.kind] ?? item.kind}
            </span>
          </button>
        ))}
      </div>

      {active && (
        <div className="p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <p className="font-medium text-slate-800">{active.name}</p>
              <p className="text-xs text-slate-500">
                {KIND_LABELS[active.kind] ?? active.kind}
              </p>
            </div>
            <a
              href={active.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-surface-muted"
            >
              <Download className="h-3.5 w-3.5" />
              Mở / Tải
            </a>
          </div>

          <div className="min-h-[480px] overflow-hidden rounded-xl border border-border bg-slate-100">
            {isImage(active.mimeType) ? (
              <div className="flex h-[min(70vh,560px)] items-center justify-center p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={active.url}
                  alt={active.name}
                  className="max-h-full max-w-full object-contain"
                />
              </div>
            ) : isPdf(active.mimeType) ? (
              <iframe
                title={active.name}
                src={active.url}
                className="h-[min(70vh,560px)] w-full bg-white"
              />
            ) : canPreviewSpreadsheet(active.mimeType, active.name) ? (
              <div className="relative h-[min(70vh,560px)]">
                <button
                  type="button"
                  onClick={() => setExcelModalId(active.id)}
                  className="absolute right-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-lg bg-slate-900/85 px-3 py-2 text-xs font-medium text-white shadow hover:bg-slate-900"
                >
                  <Maximize2 className="h-4 w-4" />
                  Xem toàn màn hình
                </button>
                <ExcelPreview
                  url={active.url}
                  file={active.file}
                  className="h-full"
                />
              </div>
            ) : (
              <div className="flex h-[min(50vh,400px)] flex-col items-center justify-center gap-3 p-8 text-center">
                <FileText className="h-16 w-16 text-slate-300" />
                <p className="text-sm text-slate-600">
                  Không xem trước trực tiếp loại file này
                </p>
                <a
                  href={active.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white"
                >
                  Tải file về
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {excelModalItem && typeof document !== "undefined"
        ? createPortal(
            <div
              className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-2 backdrop-blur-sm sm:p-5"
              role="dialog"
              aria-modal="true"
              aria-label={`Xem trước ${excelModalItem.name}`}
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) setExcelModalId(null);
              }}
            >
              <div className="flex h-[96vh] w-[98vw] max-w-[1800px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:h-[94vh] sm:w-[96vw]">
                <div className="flex flex-none items-center justify-between gap-4 border-b border-slate-200 px-4 py-3 sm:px-5">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-800">{excelModalItem.name}</p>
                    <p className="text-xs text-slate-500">Xem trước file Excel</p>
                  </div>
                  <div className="flex flex-none items-center gap-2">
                    <a
                      href={excelModalItem.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
                    >
                      <Download className="h-4 w-4" />
                      Tải file
                    </a>
                    <button
                      type="button"
                      onClick={() => setExcelModalId(null)}
                      className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                      aria-label="Đóng xem trước"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>
                <ExcelPreview
                  url={excelModalItem.url}
                  file={excelModalItem.file}
                  className="min-h-0 flex-1"
                />
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
