"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { cn } from "@/lib/utils/cn";

type PdfPreviewProps = {
  url: string;
  file?: File;
  className?: string;
};

export function PdfPreview({ url, file, className }: PdfPreviewProps) {
  const [document, setDocument] = useState<PDFDocumentProxy | null>(null);
  const [error, setError] = useState("");
  const canvasRefs = useRef(new Map<number, HTMLCanvasElement>());

  useEffect(() => {
    let cancelled = false;
    let loadedDocument: PDFDocumentProxy | null = null;

    const load = async () => {
      try {
        setError("");
        setDocument(null);
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.mjs",
          import.meta.url,
        ).toString();
        const source = file ? { data: await file.arrayBuffer() } : { url };
        loadedDocument = await pdfjs.getDocument(source).promise;
        if (!cancelled) setDocument(loadedDocument);
      } catch {
        if (!cancelled) setError("Không thể hiển thị file PDF");
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [file, url]);

  useEffect(() => {
    if (!document) return;
    let cancelled = false;
    const tasks: Array<{ cancel: () => void }> = [];

    const renderPages = async () => {
      for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
        if (cancelled) return;
        const canvas = canvasRefs.current.get(pageNumber);
        if (!canvas) continue;
        const page = await document.getPage(pageNumber);
        const baseViewport = page.getViewport({ scale: 1 });
        const availableWidth = Math.max(canvas.parentElement?.clientWidth ?? 320, 280);
        const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
        const viewport = page.getViewport({ scale: (availableWidth / baseViewport.width) * pixelRatio });
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const context = canvas.getContext("2d");
        if (!context) continue;
        const task = page.render({ canvas, canvasContext: context, viewport });
        tasks.push(task);
        await task.promise;
      }
    };

    void renderPages().catch(() => {
      if (!cancelled) setError("Không thể hiển thị đầy đủ file PDF");
    });
    return () => {
      cancelled = true;
      tasks.forEach((task) => task.cancel());
    };
  }, [document]);

  if (error) return <div className="flex min-h-72 items-center justify-center p-6 text-sm text-red-600">{error}</div>;
  if (!document) return <div className="flex min-h-72 items-center justify-center gap-2 text-sm text-slate-500"><Loader2 className="h-5 w-5 animate-spin" />Đang tải PDF...</div>;

  return (
    <div className={cn("h-full overflow-y-auto bg-slate-200 p-2 sm:p-4", className)}>
      <div className="mx-auto flex max-w-5xl flex-col gap-3">
        {Array.from({ length: document.numPages }, (_, index) => {
          const pageNumber = index + 1;
          return (
            <figure key={pageNumber} className="overflow-hidden rounded-md bg-white shadow-sm">
              <canvas ref={(canvas) => { if (canvas) canvasRefs.current.set(pageNumber, canvas); else canvasRefs.current.delete(pageNumber); }} className="block h-auto w-full" />
              <figcaption className="border-t border-slate-100 py-1 text-center text-xs text-slate-400">Trang {pageNumber} / {document.numPages}</figcaption>
            </figure>
          );
        })}
      </div>
    </div>
  );
}
