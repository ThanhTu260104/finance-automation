"use client";

import { memo, useMemo, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { CellStyle, StyledCell } from "@/lib/excel/extractStyledSheetPreview";
import { cn } from "@/lib/utils/cn";

const DEFAULT_ROW_HEIGHT = 32;
const MIN_COL_WIDTH = 48;

type VirtualExcelTableProps = {
  columns: string[];
  rows: string[][] | StyledCell[][];
  columnWidthsPx?: number[];
  rowHeightsPx?: number[];
  truncated?: boolean;
  className?: string;
};

function isStyledRow(row: string[] | StyledCell[]): row is StyledCell[] {
  return row.length > 0 && typeof row[0] === "object" && row[0] !== null && "text" in row[0];
}

function cellStyleToCss(style?: CellStyle): React.CSSProperties | undefined {
  if (!style) return undefined;
  return {
    backgroundColor: style.backgroundColor,
    color: style.color,
    fontWeight: style.fontWeight,
    fontStyle: style.fontStyle,
    textAlign: style.textAlign,
    fontSize: style.fontSize ? `${style.fontSize}pt` : undefined,
  };
}

type VirtualExcelRowProps = {
  row: string[] | StyledCell[];
  columnCount: number;
  columnWidthsPx?: number[];
  gridTemplateColumns: string;
  rowHeight: number;
  style: React.CSSProperties;
  "data-index": number;
};

const VirtualExcelRow = memo(function VirtualExcelRow({
  row,
  columnCount,
  columnWidthsPx,
  gridTemplateColumns,
  rowHeight,
  style,
  "data-index": dataIndex,
}: VirtualExcelRowProps) {
  const styled = isStyledRow(row);

  return (
    <div
      data-index={dataIndex}
      className="absolute left-0 top-0 grid w-full border-b border-slate-200/80"
      style={{ ...style, gridTemplateColumns, height: rowHeight, minHeight: rowHeight }}
    >
      {Array.from({ length: columnCount }, (_, colIndex) => {
        if (styled) {
          const cell = row[colIndex] as StyledCell | undefined;
          if (cell?.hidden) {
            return (
              <div
                key={colIndex}
                className="border-r border-slate-200/80 last:border-r-0"
                aria-hidden
              />
            );
          }
          const css = cellStyleToCss(cell?.style);
          return (
            <div
              key={colIndex}
              className={cn(
                "truncate border-r border-slate-200/80 px-2 py-1 text-sm leading-snug last:border-r-0",
                !css?.backgroundColor && "bg-white",
              )}
              style={{
                ...css,
                gridColumn: cell?.colSpan ? `span ${Math.min(cell.colSpan, columnCount - colIndex)}` : undefined,
              }}
              title={cell?.text ?? ""}
            >
              {cell?.text ?? ""}
            </div>
          );
        }

        const text = (row as string[])[colIndex] ?? "";
        return (
          <div
            key={colIndex}
            className="truncate border-r border-slate-200/80 bg-white px-2 py-1 text-sm text-slate-800 last:border-r-0"
            title={text}
          >
            {text}
          </div>
        );
      })}
    </div>
  );
});

export function VirtualExcelTable({
  columns,
  rows,
  columnWidthsPx,
  rowHeightsPx,
  truncated = false,
  className,
}: VirtualExcelTableProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const columnCount = columns.length;

  const gridTemplateColumns = useMemo(() => {
    if (columnCount === 0) return undefined;
    if (columnWidthsPx && columnWidthsPx.length === columnCount) {
      return columnWidthsPx.map((w) => `${Math.max(w, MIN_COL_WIDTH)}px`).join(" ");
    }
    return `repeat(${columnCount}, minmax(${MIN_COL_WIDTH}px, max-content))`;
  }, [columnCount, columnWidthsPx]);

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: (index) => rowHeightsPx?.[index] ?? DEFAULT_ROW_HEIGHT,
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
    <div className={cn("flex h-full min-h-0 flex-col bg-[#f3f4f6]", className)}>
      {truncated && (
        <div className="flex-none border-b border-amber-200 bg-amber-50 px-3 py-1.5 text-sm text-amber-800">
          Chỉ hiển thị tối đa {rows.length} dòng và {columnCount} cột đầu tiên
        </div>
      )}

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-auto p-2">
        <div className="min-w-max">
          <div
            className="sticky top-0 z-10 grid border border-slate-300 bg-slate-200"
            style={{ gridTemplateColumns }}
          >
            {columns.map((column, index) => (
              <div
                key={`${column}-${index}`}
                className="truncate border-r border-slate-300 px-2 py-1.5 text-left text-sm font-semibold text-slate-700 last:border-r-0"
                title={column}
              >
                {column}
              </div>
            ))}
          </div>

          {rows.length === 0 ? (
            <div className="border border-t-0 border-slate-200 bg-white px-3 py-6 text-center text-sm text-slate-500">
              Không có dữ liệu
            </div>
          ) : (
            <div
              className="relative border border-t-0 border-slate-200 bg-white"
              style={{ height: rowVirtualizer.getTotalSize() }}
            >
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const row = rows[virtualRow.index] ?? [];
                const rowHeight = rowHeightsPx?.[virtualRow.index] ?? DEFAULT_ROW_HEIGHT;
                return (
                  <VirtualExcelRow
                    key={virtualRow.key}
                    data-index={virtualRow.index}
                    row={row}
                    columnCount={columnCount}
                    columnWidthsPx={columnWidthsPx}
                    gridTemplateColumns={gridTemplateColumns ?? ""}
                    rowHeight={rowHeight}
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
