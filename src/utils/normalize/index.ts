import {
	formatCnpj,
	formatCpf,
	normalizeCep,
	stripNonDigits,
} from "@/utils/strings";

type Documentos = {
	cpf?: string | null;
	cnpj?: string | null;
};

type Contato = Documentos & {
	cep?: string | null;
	telefone?: string | null;
};

export function normalizeDocumentos<T extends Documentos>(data: T): T {
	return {
		...data,
		cpf: formatCpf(data.cpf),
		cnpj: formatCnpj(data.cnpj),
	} as T;
}

export function normalizeContato<T extends Contato>(data: T): T {
	return {
		...normalizeDocumentos(data),
		cep: normalizeCep(data.cep),
		telefone: stripNonDigits(data.telefone),
	} as T;
}
