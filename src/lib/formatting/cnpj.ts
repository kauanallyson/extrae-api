export function isValidCnpj(cnpj: string): boolean {
	const cleanCnpj = cnpj.replace(/\D/g, "");
	if (cleanCnpj.length !== 14 || /^(\d)\1{13}$/.test(cleanCnpj)) {
		return false;
	}

	const digitos = cleanCnpj.split("").map(Number);

	const calculaDigito = (slice: number[], weights: number[]): number => {
		let sum = 0;
		for (let i = 0; i < slice.length; i++) {
			sum += slice[i] * weights[i];
		}
		const remainder = sum % 11;
		return remainder < 2 ? 0 : 11 - remainder;
	};

	// Pesos para o primeiro dígito (DV1):
	const pesos1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
	const dv1 = calculaDigito(digitos.slice(0, 12), pesos1);
	if (dv1 !== digitos[12]) return false;

	// Pesos para o segundo dígito (DV2):
	const pesos2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
	const dv2 = calculaDigito(digitos.slice(0, 13), pesos2);
	if (dv2 !== digitos[13]) return false;

	return true;
}

export function formatCnpj(cnpj: string): string {
	const cleanCnpj = cnpj.replace(/\D/g, "");
	return cleanCnpj.replace(
		/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
		"$1.$2.$3/$4-$5",
	);
}
