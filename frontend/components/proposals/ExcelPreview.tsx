"use client";

import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { VirtualExcelTable } from "@/components/proposals/VirtualExcelTable";
import {
  extractSheetPreview,
  PREVIEW_MAX_COLS,
  PREVIEW_MAX_ROWS,
} from "@/lib/excel/extractSheetPreview";
import { cn } from "@/lib/utils/cn";

type ExcelPreviewProps = {
  url: string;
  file?: File;
  className?: string;
};

type WorkbookCacheEntry = {
  workbook: XLSX.WorkBook;
};

const READ_OPTIONS: XLSX.ParsingOptions = {
  type: "array",
  dense: true,
  cellFormula: false,
  cellHTML: false,
  cellStyles: false,
  sheetRows: PREVIEW_MAX_ROWS,
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

function parseWorkbook(buffer: ArrayBuffer): XLSX.WorkBook {
  return XLSX.read(buffer, READ_OPTIONS);
}

export function ExcelPreview({ url, file, className }: ExcelPreviewProps) {
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [activeSheet, setActiveSheet] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cacheKey = useMemo(() => getCacheKey(url, file), [url, file]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      setWorkbook(null);
      setActiveSheet(0);

      const cached = workbookCache.get(cacheKey);
      if (cached) {
        if (!cancelled) {
          setWorkbook(cached.workbook);
          setLoading(false);
        }
        return;
      }

      try {
        await new Promise<void>((resolve) => {
          requestAnimationFrame(() => resolve());
        });
        if (cancelled) return;

        const buffer = await loadWorkbookBuffer(url, file);
        if (cancelled) return;

        const parsed = parseWorkbook(buffer);
        workbookCache.set(cacheKey, { workbook: parsed });

        if (!cancelled) {
          setWorkbook(parsed);
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

  const sheetNames = useMemo(() => workbook?.SheetNames ?? [], [workbook]);

  const previewData = useMemo(() => {
    if (!workbook || sheetNames.length === 0) return null;

    const sheetIndex = Math.min(activeSheet, sheetNames.length - 1);
    const sheetName = sheetNames[sheetIndex];
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) return null;

    return extractSheetPreview(sheet, PREVIEW_MAX_ROWS, PREVIEW_MAX_COLS);
  }, [workbook, sheetNames, activeSheet]);

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
                "rounded-lg px-3 py-1 text-xs font-medium",
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
