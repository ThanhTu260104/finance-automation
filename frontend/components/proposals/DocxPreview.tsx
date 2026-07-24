"use client";

import { useEffect, useRef, useState } from "react";

type DocxPreviewProps = {
  url: string;
  file?: File;
  className?: string;
};

export function canPreviewDocx(mime: string, name: string) {
  return (
    mime ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    /\.docx$/i.test(name)
  );
}

export function DocxPreview({ url, file, className }: DocxPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const container = containerRef.current;
    if (!container) return;

    container.replaceChildren();
    setLoading(true);
    setError(null);

    async function load() {
      try {
        const buffer = file
          ? await file.arrayBuffer()
          : await fetch(url).then((response) => {
              if (!response.ok) {
                throw new Error("Không tải được file Word");
              }
              return response.arrayBuffer();
            });
        if (cancelled || !container) return;

        const { renderAsync } = await import("docx-preview");
        await renderAsync(buffer, container, undefined, {
          className: "docx-preview",
          inWrapper: true,
          ignoreWidth: false,
          ignoreHeight: false,
          breakPages: true,
          useBase64URL: true,
        });
        if (!cancelled) setLoading(false);
      } catch {
        if (!cancelled) {
          setError("Không đọc được file DOCX. Bạn vẫn có thể tải file về để mở.");
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
      container.replaceChildren();
    };
  }, [file, url]);

  return (
    <div className={`relative h-[min(65vh,560px)] max-w-full overflow-auto bg-slate-200 p-1 sm:p-5 ${className ?? ""}`}>
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/90 text-sm text-slate-500">
          Đang tải tài liệu Word...
        </div>
      )}
      {error && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white p-6 text-center text-sm text-slate-500">
          {error}
        </div>
      )}
      <div
        ref={containerRef}
        className="[&_.docx-wrapper]:!bg-transparent [&_.docx-wrapper]:!p-0 [&_section.docx-preview]:mx-auto [&_section.docx-preview]:shadow-md"
      />
    </div>
  );
}
