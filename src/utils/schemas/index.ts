import { t } from "elysia";

export const idParamsSchema = t.Object({
	id: t.Integer(),
});

export const CPF_PATTERN = "^\\d{3}\\.?\\d{3}\\.?\\d{3}-?\\d{2}$";

export const CNPJ_PATTERN = "^\\d{2}\\.?\\d{3}\\.?\\d{3}/?\\d{4}-?\\d{2}$";

export const CEP_PATTERN = "^\\d{5}-?\\d{3}$";

export const DDD_PATTERN = "^\\d{2,3}$";

export const TELEFONE_PATTERN = "^\\d{4,5}[- ]?\\d{4}$";
