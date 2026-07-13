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

export const sanitizeAsciiWord = (value: string): string =>
	value
		.normalize("NFD")
		.replace(/[̀-ͯ]/g, "")
		.replace(/[^a-zA-Z0-9]/g, "");
