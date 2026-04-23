export function isValidCep(cep: string): boolean {
	const cleanCep = cep.replace(/\D/g, "");
	return cleanCep.length === 8;
}

export function formatCep(cep: string): string {
	const cleanCep = cep.replace(/\D/g, "");
	return cleanCep.replace(/^(\d{5})(\d{3})$/, "$1-$2");
}
