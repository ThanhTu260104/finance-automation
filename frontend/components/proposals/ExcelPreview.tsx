"use client";

import { useEffect, useState } from "react";
import * as XLSX from "xlsx";

type ExcelPreviewProps = {
  url: string;
  file?: File;
  className?: string;
};

export function ExcelPreview({ url, file, className }: ExcelPreviewProps) {
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [activeSheet, setActiveSheet] = useState(0);
  const [tableHtml, setTableHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setError(null);
      setTableHtml(null);
      try {
        const buffer = file
          ? await file.arrayBuffer()
          : await fetch(url).then((r) => {
              if (!r.ok) throw new Error("Không tải được file");
              return r.arrayBuffer();
            });

        const workbook = XLSX.read(buffer, { type: "array" });
        if (cancelled) return;

        setSheetNames(workbook.SheetNames);
        const sheetName = workbook.SheetNames[activeSheet] ?? workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const html = XLSX.utils.sheet_to_html(sheet, { editable: false });
        setTableHtml(html);
      } catch {
        if (!cancelled) setError("Không đọc được file Excel");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [url, file, activeSheet]);

  if (error) {
    return (
      <div className={`flex h-[min(70vh,560px)] items-center justify-center p-6 text-sm text-slate-500 ${className ?? ""}`}>
        {error}
      </div>
    );
  }

  if (!tableHtml) {
    return (
      <div className={`flex h-[min(70vh,560px)] items-center justify-center text-sm text-slate-400 ${className ?? ""}`}>
        Đang tải bảng tính...
      </div>
    );
  }

  return (
    <div className={className}>
      {sheetNames.length > 1 && (
        <div className="flex flex-wrap gap-2 border-b border-border bg-white px-3 py-2">
          {sheetNames.map((name, idx) => (
            <button
              key={name}
              type="button"
              onClick={() => setActiveSheet(idx)}
              className={`rounded-lg px-3 py-1 text-xs font-medium ${
                idx === activeSheet
                  ? "bg-primary-600 text-white"
                  : "bg-surface-muted text-slate-600"
              }`}
            >
              {name}
            </button>
          ))}
        </div>
      )}
      <div
        className="h-[min(70vh,560px)] overflow-auto bg-white p-2 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-slate-200 [&_td]:px-2 [&_td]:py-1 [&_td]:text-xs [&_th]:border [&_th]:border-slate-300 [&_th]:bg-slate-100 [&_th]:px-2 [&_th]:py-1.5 [&_th]:text-left [&_th]:text-xs [&_th]:font-semibold"
        dangerouslySetInnerHTML={{ __html: tableHtml }}
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
