export const stripNonDigits = (
	value: string | null | undefined,
): typeof value =>
	typeof value === "string" ? value.replace(/\D/g, "") : value;

export const normalizeCep = (
	value: string | null | undefined,
): typeof value => {
	if (typeof value !== "string") return value;
	const digits = value.replace(/\D/g, "");
	return digits.length === 8
		? `${digits.slice(0, 5)}-${digits.slice(5)}`
		: value;
};

export const formatCpf = (value: string | null | undefined): typeof value => {
	if (typeof value !== "string") return value;
	const digits = value.replace(/\D/g, "");
	return digits.length === 11
		? `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
		: value;
};

export const formatCnpj = (value: string | null | undefined): typeof value => {
	if (typeof value !== "string") return value;
	const chars = value.toUpperCase().replace(/[^A-Z0-9]/g, "");
	return chars.length === 14
		? `${chars.slice(0, 2)}.${chars.slice(2, 5)}.${chars.slice(5, 8)}/${chars.slice(8, 12)}-${chars.slice(12)}`
		: value;
};

export const formatDateBr = (
	value: string | Date | null | undefined,
): typeof value => {
	if (value == null) return value;

	if (value instanceof Date) {
		const day = String(value.getDate()).padStart(2, "0");
		const month = String(value.getMonth() + 1).padStart(2, "0");
		return `${day}/${month}/${value.getFullYear()}`;
	}

	const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
	if (isoMatch) {
		const [, year, month, day] = isoMatch;
		return `${day}/${month}/${year}`;
	}

	return value;
};

export const sanitizeAsciiWord = (value: string): string =>
	value
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/[^a-zA-Z0-9]/g, "");
