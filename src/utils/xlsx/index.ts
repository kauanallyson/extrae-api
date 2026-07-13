import type ExcelJS from "exceljs";

export const SPREADSHEET_CONTENT_TYPE =
	"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export function cellValue(value: unknown): string | number {
	if (value == null) return "";
	if (typeof value === "number") return value;
	if (Array.isArray(value)) {
		return value.map((item) => (item != null ? String(item) : "")).join(", ");
	}
	return String(value);
}

export function writeEntries(
	sheet: ExcelJS.Worksheet,
	entries: [string, unknown][],
	excludedFields: Set<string> = new Set(),
): void {
	for (const [key, value] of entries) {
		if (excludedFields.has(key)) continue;

		if (Array.isArray(value)) {
			const row = sheet.addRow([key, ...value.map((item) => item ?? "")]);
			row.getCell(1).font = { bold: false };
		} else if (typeof value === "number") {
			sheet.addRow([key, value]);
		} else {
			sheet.addRow([key, value != null ? String(value) : ""]);
		}
	}
}
