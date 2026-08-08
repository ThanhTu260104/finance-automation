"use client";

import { memo, useMemo, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { cn } from "@/lib/utils/cn";

const ROW_HEIGHT = 28;
const MIN_COL_WIDTH = 96;

type VirtualExcelTableProps = {
  columns: string[];
  rows: string[][];
  truncated?: boolean;
  className?: string;
};

type VirtualExcelRowProps = {
  row: string[];
  columnCount: number;
  gridTemplateColumns: string;
  style: React.CSSProperties;
  "data-index": number;
};

const VirtualExcelRow = memo(function VirtualExcelRow({
  row,
  columnCount,
  gridTemplateColumns,
  style,
  "data-index": dataIndex,
}: VirtualExcelRowProps) {
  return (
    <div
      data-index={dataIndex}
      className="absolute left-0 top-0 grid w-full border-b border-slate-200 bg-white"
      style={{ ...style, gridTemplateColumns }}
    >
      {Array.from({ length: columnCount }, (_, colIndex) => (
        <div
          key={colIndex}
          className="truncate border-r border-slate-200 px-2 py-1 text-xs text-slate-800 last:border-r-0"
          title={row[colIndex] ?? ""}
        >
          {row[colIndex] ?? ""}
        </div>
      ))}
    </div>
  );
});

export function VirtualExcelTable({
  columns,
  rows,
  truncated = false,
  className,
}: VirtualExcelTableProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const columnCount = columns.length;

  const gridTemplateColumns = useMemo(
    () =>
      columnCount > 0
        ? `repeat(${columnCount}, minmax(${MIN_COL_WIDTH}px, max-content))`
        : undefined,
    [columnCount],
  );

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 12,
  });

  if (columnCount === 0) {
    return (
      <div
        className={cn(
          "flex h-full items-center justify-center bg-white p-4 text-sm text-slate-500",
          className,
        )}
      >
        Sheet trống
      </div>
    );
  }

  return (
    <div className={cn("flex h-full min-h-0 flex-col bg-white", className)}>
      {truncated && (
        <div className="flex-none border-b border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-amber-800">
          Chỉ hiển thị tối đa {rows.length} dòng và {columnCount} cột đầu tiên
        </div>
      )}

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-auto p-2">
        <div className="min-w-max">
          <div
            className="sticky top-0 z-10 grid border border-slate-300 bg-slate-100"
            style={{ gridTemplateColumns }}
          >
            {columns.map((column, index) => (
              <div
                key={`${column}-${index}`}
                className="truncate border-r border-slate-300 px-2 py-1.5 text-left text-xs font-semibold text-slate-700 last:border-r-0"
                title={column}
              >
                {column}
              </div>
            ))}
          </div>

          {rows.length === 0 ? (
            <div className="border border-t-0 border-slate-200 px-3 py-6 text-center text-xs text-slate-500">
              Không có dữ liệu
            </div>
          ) : (
            <div
              className="relative border border-t-0 border-slate-200"
              style={{ height: rowVirtualizer.getTotalSize() }}
            >
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const row = rows[virtualRow.index] ?? [];
                return (
                  <VirtualExcelRow
                    key={virtualRow.key}
                    data-index={virtualRow.index}
                    row={row}
                    columnCount={columnCount}
                    gridTemplateColumns={gridTemplateColumns ?? ""}
                    style={{
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
