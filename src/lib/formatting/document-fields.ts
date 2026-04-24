import { formatCep, isValidCep } from "./cep";
import { formatCnpj, isValidCnpj } from "./cnpj";
import { formatCpf, isValidCpf } from "./cpf";

type DocumentFields = {
	cep?: string | null;
	cnpj?: string | null;
	cpf?: string | null;
};

export type DocumentFieldName = keyof DocumentFields;

export function normalizeDocumentFields<T extends DocumentFields>(
	data: T,
): {
	data: T;
	invalidFields: DocumentFieldName[];
} {
	const normalized: T = { ...data };
	const invalidFields: DocumentFieldName[] = [];

	if (normalized.cpf) {
		if (!isValidCpf(normalized.cpf)) {
			invalidFields.push("cpf");
		} else {
			normalized.cpf = formatCpf(normalized.cpf) as T["cpf"];
		}
	}

	if (normalized.cnpj) {
		if (!isValidCnpj(normalized.cnpj)) {
			invalidFields.push("cnpj");
		} else {
			normalized.cnpj = formatCnpj(normalized.cnpj) as T["cnpj"];
		}
	}

	if (normalized.cep) {
		if (!isValidCep(normalized.cep)) {
			invalidFields.push("cep");
		} else {
			normalized.cep = formatCep(normalized.cep) as T["cep"];
		}
	}

	return {
		data: normalized,
		invalidFields,
	};
}
