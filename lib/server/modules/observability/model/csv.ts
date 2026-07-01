import { z } from "zod";

const formulaPrefixPattern = /^[=+\-@]/;
const csvContentType = "text/csv; charset=utf-8";

export type ObservabilityCsvCell = string | number | boolean | Date | null | undefined;

export type ObservabilityCsvColumn<TRow> = {
  header: string;
  value: (row: TRow) => ObservabilityCsvCell;
};

export const observabilityCsvExportDtoSchema = z.object({
  filename: z.string().min(1),
  contentType: z.literal(csvContentType),
  rowCount: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(),
  csv: z.string(),
});

export type ObservabilityCsvExportDto = z.infer<typeof observabilityCsvExportDtoSchema>;

function normalizeCell(value: ObservabilityCsvCell) {
  if (value === null || value === undefined) {
    return "";
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return String(value);
}

export function escapeObservabilityCsvCell(value: ObservabilityCsvCell) {
  const normalizedValue = normalizeCell(value);
  const safeValue = formulaPrefixPattern.test(normalizedValue)
    ? `'${normalizedValue}`
    : normalizedValue;

  return `"${safeValue.replace(/"/g, '""')}"`;
}

export function buildObservabilityCsv<TRow>(
  rows: TRow[],
  columns: Array<ObservabilityCsvColumn<TRow>>,
) {
  const header = columns.map((column) => escapeObservabilityCsvCell(column.header)).join(",");
  const body = rows.map((row) =>
    columns.map((column) => escapeObservabilityCsvCell(column.value(row))).join(","),
  );

  return [header, ...body].join("\n");
}

export function createObservabilityCsvExport<TRow>(input: {
  filename: string;
  rows: TRow[];
  total: number;
  columns: Array<ObservabilityCsvColumn<TRow>>;
}): ObservabilityCsvExportDto {
  return {
    filename: input.filename,
    contentType: csvContentType,
    rowCount: input.rows.length,
    total: input.total,
    csv: buildObservabilityCsv(input.rows, input.columns),
  };
}
