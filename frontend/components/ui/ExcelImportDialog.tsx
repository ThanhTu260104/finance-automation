"use client";

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Download, FileSpreadsheet, Loader2, Upload, X } from "lucide-react";
import * as XLSX from "xlsx";

type ExcelImportDialogProps = {
  title: string;
  templateFileName: string;
  templateRow: Record<string, string | number>;
  onImport: (file: File) => Promise<void>;
};

export function ExcelImportDialog({
  title,
  templateFileName,
  templateRow,
  onImport,
}: ExcelImportDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [open, setOpen] = useState(false);
  const [reading, setReading] = useState(false);
  const [importing, setImporting] = useState(false);
  const previewRows = useMemo(() => rows.slice(0, 50), [rows]);

  const reset = () => {
    if (importing) return;
    setOpen(false);
    setFile(null);
    setHeaders([]);
    setRows([]);
  };

  const downloadTemplate = () => {
    const sheet = XLSX.utils.json_to_sheet([templateRow]);
    sheet["!cols"] = Object.entries(templateRow).map(([header, value]) => ({
      wch: Math.min(40, Math.max(14, header.length + 3, String(value).length + 3)),
    }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "Mau import");
    XLSX.writeFile(workbook, templateFileName);
  };

  const readFile = async (selectedFile: File) => {
    setReading(true);
    try {
      const workbook = XLSX.read(await selectedFile.arrayBuffer());
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const parsedRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
        defval: "",
      });
      const range = XLSX.utils.decode_range(sheet["!ref"] || "A1:A1");
      const parsedHeaders: string[] = [];
      for (let column = range.s.c; column <= range.e.c; column++) {
        const cell = sheet[XLSX.utils.encode_cell({ r: range.s.r, c: column })];
        if (cell?.v !== undefined && String(cell.v).trim()) {
          parsedHeaders.push(String(cell.v).trim());
        }
      }
      setFile(selectedFile);
      setHeaders(parsedHeaders);
      setRows(parsedRows);
      setOpen(true);
    } finally {
      setReading(false);
    }
  };

  const confirm = async () => {
    if (!file || rows.length === 0) return;
    setImporting(true);
    try {
      await onImport(file);
      reset();
      setOpen(false);
      setFile(null);
      setHeaders([]);
      setRows([]);
    } finally {
      setImporting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={downloadTemplate}
        className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 hover:border-primary-300 hover:text-primary-600"
      >
        <Download className="h-4 w-4" />
        Tải file mẫu
      </button>
      <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-border bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 hover:border-primary-300 hover:text-primary-600">
        {reading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        Import Excel
        <input
          type="file"
          accept=".xlsx,.xls,.csv"
          className="sr-only"
          disabled={reading}
          onChange={(event) => {
            const selectedFile = event.target.files?.[0];
            if (selectedFile) void readFile(selectedFile);
            event.target.value = "";
          }}
        />
      </label>

      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-[100000] flex items-center justify-center p-3 sm:p-6">
            <div className="absolute inset-0 bg-slate-900/55 backdrop-blur-sm" onClick={reset} />
            <div className="relative z-10 flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
              <div className="flex items-start justify-between gap-4 border-b border-border px-4 py-4 sm:px-6">
                <div>
                  <h2 className="flex items-center gap-2 font-semibold text-slate-900">
                    <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
                    Xem trước {title}
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    {file?.name} · {rows.length} dòng dữ liệu
                    {rows.length > 50 ? " · đang hiển thị 50 dòng đầu" : ""}
                  </p>
                </div>
                <button type="button" onClick={reset} disabled={importing} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-auto p-3 sm:p-5">
                {rows.length === 0 ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-8 text-center text-sm text-amber-700">
                    File không có dòng dữ liệu. Vui lòng kiểm tra lại file mẫu.
                  </div>
                ) : (
                  <table className="w-max min-w-full table-auto border-separate border-spacing-0 text-sm">
                    <thead className="sticky top-0 z-10 bg-slate-100 text-left text-xs uppercase text-slate-500">
                      <tr>
                        <th className="border-b border-r border-slate-200 px-3 py-2.5">#</th>
                        {headers.map((header) => (
                          <th key={header} className="min-w-40 whitespace-nowrap border-b border-r border-slate-200 px-4 py-2.5 font-semibold last:border-r-0">{header}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map((row, index) => (
                        <tr key={index} className="odd:bg-white even:bg-slate-50/60">
                          <td className="border-b border-r border-slate-100 px-3 py-2 text-xs text-slate-400">{index + 2}</td>
                          {headers.map((header) => (
                            <td key={header} className="min-w-40 max-w-80 border-b border-r border-slate-100 px-4 py-2 text-slate-700 last:border-r-0">
                              <span className="block whitespace-normal break-words">{String(row[header] ?? "") || "—"}</span>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              <div className="flex flex-col-reverse gap-2 border-t border-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                  Chọn file khác
                  <input type="file" accept=".xlsx,.xls,.csv" className="sr-only" disabled={importing} onChange={(event) => {
                    const selectedFile = event.target.files?.[0];
                    if (selectedFile) void readFile(selectedFile);
                    event.target.value = "";
                  }} />
                </label>
                <div className="flex gap-2">
                  <button type="button" onClick={reset} disabled={importing} className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-slate-600 sm:flex-none">Hủy</button>
                  <button type="button" onClick={confirm} disabled={importing || rows.length === 0} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60 sm:flex-none">
                    {importing && <Loader2 className="h-4 w-4 animate-spin" />}
                    {importing ? "Đang import..." : `Xác nhận import ${rows.length} dòng`}
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
