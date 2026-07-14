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
