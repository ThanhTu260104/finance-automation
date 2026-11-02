import ExcelJS from "exceljs";
import { columnLabel } from "@/lib/excel/extractSheetPreview";

export const PREVIEW_MAX_ROWS = 500;
export const PREVIEW_MAX_COLS = 60;

export type CellStyle = {
  backgroundColor?: string;
  color?: string;
  fontWeight?: number | string;
  fontStyle?: string;
  textAlign?: "left" | "center" | "right" | "justify";
  fontSize?: number;
};

export type StyledCell = {
  text: string;
  style?: CellStyle;
  colSpan?: number;
  hidden?: boolean;
};

export type StyledSheetPreview = {
  columns: string[];
  columnWidthsPx: number[];
  rowHeightsPx: number[];
  rows: StyledCell[][];
  truncated: boolean;
};

const DEFAULT_COL_PX = 88;
const CHAR_TO_PX = 7.2;
const DEFAULT_ROW_PX = 32;

function argbToCss(argb?: Partial<ExcelJS.Color>): string | undefined {
  if (!argb) return undefined;
  const raw = argb.argb ?? (argb as { rgb?: string }).rgb;
  if (!raw || typeof raw !== "string") return undefined;
  const hex = raw.length === 8 ? raw.slice(2) : raw;
  if (hex.length !== 6) return undefined;
  return `#${hex}`;
}

function readCellStyle(cell: ExcelJS.Cell): CellStyle | undefined {
  const style: CellStyle = {};
  const fill = cell.fill;
  if (fill && fill.type === "pattern" && fill.pattern !== "none") {
    const bg = argbToCss(fill.fgColor);
    if (bg) style.backgroundColor = bg;
  }

  const font = cell.font;
  if (font) {
    const color = argbToCss(font.color);
    if (color) style.color = color;
    if (font.bold) style.fontWeight = 700;
    if (font.italic) style.fontStyle = "italic";
    if (font.size) style.fontSize = font.size;
  }

  const align = cell.alignment?.horizontal;
  if (align === "center" || align === "right" || align === "justify" || align === "left") {
    style.textAlign = align;
  }

  return Object.keys(style).length > 0 ? style : undefined;
}

function cellDisplayText(cell: ExcelJS.Cell): string {
  if (cell.text != null && cell.text !== "") return cell.text;
  const value = cell.value;
  if (value == null) return "";
  if (value instanceof Date) return value.toLocaleString();
  if (typeof value === "object" && value !== null && "richText" in value) {
    const rich = value as ExcelJS.CellRichTextValue;
    return rich.richText.map((part) => part.text).join("");
  }
  if (typeof value === "object" && value !== null && "result" in value) {
    const formula = value as ExcelJS.CellFormulaValue;
    if (formula.result != null) return String(formula.result);
  }
  return String(value);
}

type MergeMaster = { row: number; col: number; rowSpan: number; colSpan: number };

function parseMerges(worksheet: ExcelJS.Worksheet): MergeMaster[] {
  const merges = worksheet.model.merges ?? [];
  const masters: MergeMaster[] = [];

  for (const range of merges) {
    const match = /^([A-Z]+)(\d+):([A-Z]+)(\d+)$/.exec(range.replace(/\$/g, ""));
    if (!match) continue;
    const [, c1, r1, c2, r2] = match;
    const startCol = columnLettersToIndex(c1) - 1;
    const endCol = columnLettersToIndex(c2) - 1;
    const startRow = Number(r1) - 1;
    const endRow = Number(r2) - 1;
    masters.push({
      row: startRow,
      col: startCol,
      rowSpan: endRow - startRow + 1,
      colSpan: endCol - startCol + 1,
    });
  }

  return masters;
}

function columnLettersToIndex(letters: string): number {
  let n = 0;
  for (let i = 0; i < letters.length; i += 1) {
    n = n * 26 + (letters.charCodeAt(i) - 64);
  }
  return n;
}

function isHiddenByMerge(
  row: number,
  col: number,
  masters: MergeMaster[],
): boolean {
  for (const m of masters) {
    if (row >= m.row && row < m.row + m.rowSpan && col >= m.col && col < m.col + m.colSpan) {
      if (row !== m.row || col !== m.col) return true;
    }
  }
  return false;
}

function mergeAt(row: number, col: number, masters: MergeMaster[]): MergeMaster | undefined {
  return masters.find((m) => m.row === row && m.col === col);
}

export async function extractStyledSheetPreviewFromBuffer(
  buffer: ArrayBuffer,
  sheetIndex: number,
  maxRows: number,
  maxCols: number,
): Promise<StyledSheetPreview> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const worksheet = workbook.worksheets[sheetIndex];
  if (!worksheet) {
    return {
      columns: [],
      columnWidthsPx: [],
      rowHeightsPx: [],
      rows: [],
      truncated: false,
    };
  }

  const dim = worksheet.dimensions;
  const totalRows = dim ? dim.bottom - dim.top + 1 : worksheet.rowCount;
  const totalCols = dim ? dim.right - dim.left + 1 : worksheet.columnCount;
  const rowCount = Math.min(maxRows, Math.max(totalRows, 0));
  const colCount = Math.min(maxCols, Math.max(totalCols, 0));
  const truncated = totalRows > maxRows || totalCols > maxCols;

  const startRow = dim?.top ?? 1;
  const startCol = dim?.left ?? 1;

  const columns = Array.from({ length: colCount }, (_, index) => columnLabel(index));
  const columnWidthsPx = Array.from({ length: colCount }, (_, index) => {
    const col = worksheet.getColumn(startCol + index);
    const width = col.width;
    if (width == null) return DEFAULT_COL_PX;
    return Math.min(Math.max(Math.round(width * CHAR_TO_PX), 48), 320);
  });

  const masters = parseMerges(worksheet);
  const rows: StyledCell[][] = [];
  const rowHeightsPx: number[] = [];

  for (let r = 0; r < rowCount; r += 1) {
    const excelRowIndex = startRow + r;
    const excelRow = worksheet.getRow(excelRowIndex);
    const rowHeight = excelRow.height;
    rowHeightsPx.push(
      rowHeight != null ? Math.min(Math.max(Math.round(rowHeight * 1.33), 24), 120) : DEFAULT_ROW_PX,
    );

    const rowCells: StyledCell[] = [];
    for (let c = 0; c < colCount; c += 1) {
      const excelColIndex = startCol + c;
      const absRow = excelRowIndex - 1;
      const absCol = excelColIndex - 1;
      const colHidden = worksheet.getColumn(excelColIndex).hidden;
      const rowHidden = excelRow.hidden;

      if (isHiddenByMerge(absRow, absCol, masters)) {
        rowCells.push({ text: "", hidden: true });
        continue;
      }

      const cell = worksheet.getCell(excelRowIndex, excelColIndex);
      const merge = mergeAt(absRow, absCol, masters);
      const baseStyle = readCellStyle(cell);
      const style =
        rowHidden || colHidden
          ? {
              ...baseStyle,
              backgroundColor: baseStyle?.backgroundColor ?? "#f8fafc",
              color: baseStyle?.color ?? "#64748b",
            }
          : baseStyle;
      rowCells.push({
        text: cellDisplayText(cell),
        style,
        colSpan: merge && merge.colSpan > 1 ? merge.colSpan : undefined,
      });
    }
    rows.push(rowCells);
  }

  return {
    columns,
    columnWidthsPx,
    rowHeightsPx,
    rows,
    truncated,
  };
}

export function listSheetNamesFromBuffer(buffer: ArrayBuffer): Promise<string[]> {
  const workbook = new ExcelJS.Workbook();
  return workbook.xlsx.load(buffer).then(() => workbook.worksheets.map((ws) => ws.name));
}
