"use client";

import { useMemo, useState } from "react";
import { ExternalLink } from "lucide-react";
import { ExcelPreview } from "@/components/proposals/ExcelPreview";
import {
  canUseOfficeOnlineViewer,
  officeOnlineEmbedUrl,
  officeOnlineViewUrl,
} from "@/lib/excel/officeOnlineViewer";
import { cn } from "@/lib/utils/cn";

type SpreadsheetPreviewProps = {
  url: string;
  file?: File;
  fileName?: string;
  className?: string;
};

export function SpreadsheetPreview({
  url,
  file,
  fileName,
  className,
}: SpreadsheetPreviewProps) {
  const [officeFailed, setOfficeFailed] = useState(false);

  const displayName = fileName ?? file?.name ?? url;

  const useOffice = useMemo(() => {
    if (file) return false;
    if (officeFailed) return false;
    return canUseOfficeOnlineViewer(url, displayName);
  }, [file, officeFailed, url, displayName]);

  if (useOffice) {
    const embedUrl = officeOnlineEmbedUrl(url);
    const viewUrl = officeOnlineViewUrl(url);

    return (
      <div className={cn("flex h-full min-h-0 flex-col bg-slate-100", className)}>
        <div className="flex flex-none items-center justify-end gap-2 border-b border-slate-200 bg-white px-3 py-2">
          <a
            href={viewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            <ExternalLink className="h-4 w-4" />
            Mở bằng Excel Online
          </a>
        </div>
        <iframe
          title={`Xem ${displayName}`}
          src={embedUrl}
          className="min-h-0 flex-1 border-0 bg-white"
          allowFullScreen
          onError={() => setOfficeFailed(true)}
        />
      </div>
    );
  }

  return (
    <div className={cn("flex h-full min-h-0 flex-col", className)}>
      {!file && !canUseOfficeOnlineViewer(url, displayName) && (
        <p className="flex-none border-b border-amber-100 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Bản xem rút gọn trên trình duyệt (màu, dòng ẩn, bố cục phức tạp có thể lệch file gốc).
          Trên server HTTPS công khai hệ thống tự dùng trình xem Excel Online giống Microsoft Office.
          Hoặc tải file và mở bằng Excel.
        </p>
      )}
      <ExcelPreview url={url} file={file} className="min-h-0 flex-1" />
    </div>
  );
}
