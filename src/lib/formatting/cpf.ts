export function isValidCpf(cpf: string): boolean {
	const cleanCpf = cpf.replace(/\D/g, "");

	if (cleanCpf.length !== 11 || /^(\d)\1{10}$/.test(cleanCpf)) {
		return false;
	}

	const digitos = cleanCpf.split("").map(Number);

	// Cálculo do primeiro dígito verificador (DV1)
	let sum = 0;
	for (let i = 0; i < 9; i++) {
		sum += digitos[i] * (10 - i);
	}
	let resto = (sum * 10) % 11;
	const dv1 = resto === 10 || resto === 11 ? 0 : resto;
	if (dv1 !== digitos[9]) return false;

	// Cálculo do segundo dígito verificador (DV2)
	sum = 0;
	for (let i = 0; i < 10; i++) {
		sum += digitos[i] * (11 - i);
	}
	resto = (sum * 10) % 11;
	const dv2 = resto === 10 || resto === 11 ? 0 : resto;
	if (dv2 !== digitos[10]) return false;

	return true;
}

export function formatCpf(cpf: string): string {
	const cleanCpf = cpf.replace(/\D/g, "");
	return cleanCpf.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
}
