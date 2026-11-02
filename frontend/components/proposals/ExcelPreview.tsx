"use client";

import { useEffect, useMemo, useState } from "react";
import { VirtualExcelTable } from "@/components/proposals/VirtualExcelTable";
import {
  extractStyledSheetPreviewFromBuffer,
  listSheetNamesFromBuffer,
  PREVIEW_MAX_COLS,
  PREVIEW_MAX_ROWS,
  type StyledSheetPreview,
} from "@/lib/excel/extractStyledSheetPreview";
import { cn } from "@/lib/utils/cn";

type ExcelPreviewProps = {
  url: string;
  file?: File;
  className?: string;
};

type WorkbookCacheEntry = {
  sheetNames: string[];
  sheets: Map<number, StyledSheetPreview>;
};

const workbookCache = new Map<string, WorkbookCacheEntry>();

function getCacheKey(url: string, file?: File): string {
  if (file) {
    return `file:${file.name}:${file.size}:${file.lastModified}`;
  }
  return `url:${url}`;
}

async function loadWorkbookBuffer(url: string, file?: File): Promise<ArrayBuffer> {
  if (file) {
    return file.arrayBuffer();
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Không tải được file");
  }
  return response.arrayBuffer();
}

export function ExcelPreview({ url, file, className }: ExcelPreviewProps) {
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [sheets, setSheets] = useState<Map<number, StyledSheetPreview>>(new Map());
  const [activeSheet, setActiveSheet] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [buffer, setBuffer] = useState<ArrayBuffer | null>(null);

  const cacheKey = useMemo(() => getCacheKey(url, file), [url, file]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      setSheetNames([]);
      setSheets(new Map());
      setActiveSheet(0);
      setBuffer(null);

      const cached = workbookCache.get(cacheKey);
      if (cached) {
        if (!cancelled) {
          setSheetNames(cached.sheetNames);
          setSheets(cached.sheets);
          setLoading(false);
        }
        return;
      }

      try {
        await new Promise<void>((resolve) => {
          requestAnimationFrame(() => resolve());
        });
        if (cancelled) return;

        const loadedBuffer = await loadWorkbookBuffer(url, file);
        if (cancelled) return;

        const names = await listSheetNamesFromBuffer(loadedBuffer.slice(0));
        const firstPreview = await extractStyledSheetPreviewFromBuffer(
          loadedBuffer.slice(0),
          0,
          PREVIEW_MAX_ROWS,
          PREVIEW_MAX_COLS,
        );

        const sheetMap = new Map<number, StyledSheetPreview>();
        sheetMap.set(0, firstPreview);

        workbookCache.set(cacheKey, { sheetNames: names, sheets: sheetMap });

        if (!cancelled) {
          setBuffer(loadedBuffer);
          setSheetNames(names);
          setSheets(sheetMap);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setError("Không đọc được file Excel");
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [cacheKey, url, file]);

  useEffect(() => {
    if (!buffer || sheetNames.length === 0) return;
    if (sheets.has(activeSheet)) return;

    let cancelled = false;

    void extractStyledSheetPreviewFromBuffer(
      buffer.slice(0),
      activeSheet,
      PREVIEW_MAX_ROWS,
      PREVIEW_MAX_COLS,
    ).then((preview) => {
      if (cancelled) return;
      setSheets((current) => {
        const next = new Map(current);
        next.set(activeSheet, preview);
        const cached = workbookCache.get(cacheKey);
        if (cached) {
          cached.sheets.set(activeSheet, preview);
        }
        return next;
      });
    });

    return () => {
      cancelled = true;
    };
  }, [activeSheet, buffer, cacheKey, sheetNames.length, sheets]);

  const previewData = sheets.get(activeSheet) ?? null;

  if (error) {
    return (
      <div
        className={cn(
          "flex h-[min(70vh,560px)] items-center justify-center p-6 text-sm text-slate-500",
          className,
        )}
      >
        {error}
      </div>
    );
  }

  if (loading || !previewData) {
    return (
      <div
        className={cn(
          "flex h-[min(70vh,560px)] items-center justify-center text-sm text-slate-400",
          className,
        )}
      >
        Đang tải bảng tính...
      </div>
    );
  }

  return (
    <div className={cn("flex h-[min(70vh,560px)] min-h-0 flex-col", className)}>
      {sheetNames.length > 1 && (
        <div className="flex flex-none flex-wrap gap-2 border-b border-border bg-white px-3 py-2">
          {sheetNames.map((name, index) => (
            <button
              key={name}
              type="button"
              onClick={() => setActiveSheet(index)}
              className={cn(
                "rounded-lg px-3 py-1 text-sm font-medium",
                index === activeSheet
                  ? "bg-primary-600 text-white"
                  : "bg-surface-muted text-slate-600",
              )}
            >
              {name}
            </button>
          ))}
        </div>
      )}

      <VirtualExcelTable
        columns={previewData.columns}
        rows={previewData.rows}
        columnWidthsPx={previewData.columnWidthsPx}
        rowHeightsPx={previewData.rowHeightsPx}
        truncated={previewData.truncated}
        className="min-h-0 flex-1"
      />
    </div>
  );
}

function isSpreadsheet(mime: string, name: string) {
  return (
    mime.includes("spreadsheet") ||
    mime.includes("excel") ||
    /\.xlsx?$/i.test(name)
  );
}

export function canPreviewSpreadsheet(mime: string, name: string) {
  return isSpreadsheet(mime, name);
}
