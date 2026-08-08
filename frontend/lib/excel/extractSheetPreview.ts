import { utils, type CellObject, type WorkSheet } from "xlsx";

export const PREVIEW_MAX_ROWS = 200;
export const PREVIEW_MAX_COLS = 40;

export type SheetPreviewData = {
  columns: string[];
  rows: string[][];
  truncated: boolean;
};

type DenseWorkSheet = WorkSheet & {
  "!data"?: (CellObject | undefined)[][];
};

function cellToString(cell: CellObject | null | undefined): string {
  if (!cell) return "";
  if (cell.w != null && cell.w !== "") return cell.w;
  const value = cell.v;
  if (value == null) return "";
  if (value instanceof Date) return value.toLocaleString();
  return String(value);
}

/** Excel-style column label: 0 -> A, 25 -> Z, 26 -> AA */
export function columnLabel(index: number): string {
  let label = "";
  let n = index + 1;
  while (n > 0) {
    const remainder = (n - 1) % 26;
    label = String.fromCharCode(65 + remainder) + label;
    n = Math.floor((n - 1) / 26);
  }
  return label;
}

function isDenseSheet(sheet: WorkSheet): sheet is DenseWorkSheet {
  return Array.isArray(sheet["!data"]);
}

function getSheetDimensions(sheet: WorkSheet): { totalRows: number; totalCols: number } {
  if (isDenseSheet(sheet)) {
    const data = sheet["!data"] ?? [];
    let totalCols = 0;
    for (const row of data) {
      if (row && row.length > totalCols) totalCols = row.length;
    }
    return { totalRows: data.length, totalCols };
  }

  const ref = sheet["!ref"];
  if (!ref) return { totalRows: 0, totalCols: 0 };

  const range = utils.decode_range(ref);
  return {
    totalRows: range.e.r - range.s.r + 1,
    totalCols: range.e.c - range.s.c + 1,
  };
}

export function extractSheetPreview(
  sheet: WorkSheet,
  maxRows: number,
  maxCols: number,
): SheetPreviewData {
  const { totalRows, totalCols } = getSheetDimensions(sheet);
  const rowCount = Math.min(maxRows, totalRows);
  const colCount = Math.min(maxCols, totalCols);
  const truncated = totalRows > maxRows || totalCols > maxCols;

  const columns = Array.from({ length: colCount }, (_, index) => columnLabel(index));
  const rows: string[][] = [];

  if (rowCount === 0 || colCount === 0) {
    return { columns, rows, truncated };
  }

  if (isDenseSheet(sheet)) {
    const data = sheet["!data"] ?? [];
    for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
      const sourceRow = data[rowIndex] ?? [];
      const row: string[] = [];
      for (let colIndex = 0; colIndex < colCount; colIndex += 1) {
        row.push(cellToString(sourceRow[colIndex]));
      }
      rows.push(row);
    }
    return { columns, rows, truncated };
  }

  const ref = sheet["!ref"];
  if (!ref) return { columns, rows, truncated };

  const range = utils.decode_range(ref);
  for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
    const row: string[] = [];
    for (let colIndex = 0; colIndex < colCount; colIndex += 1) {
      const address = utils.encode_cell({
        r: range.s.r + rowIndex,
        c: range.s.c + colIndex,
      });
      row.push(cellToString(sheet[address] as CellObject | undefined));
    }
    rows.push(row);
  }

  return { columns, rows, truncated };
}
