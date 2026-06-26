import { z } from "zod";

export const idParamsSchema = z.object({
	id: z.coerce.number().int(),
});

export const cpfSchema = z.string().regex(/^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/);

export const cnpjSchema = z
	.string()
	.regex(/^\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}$/);

export const cepSchema = z.string().regex(/^\d{5}-?\d{3}$/);

export const dddSchema = z.string().regex(/^\d{2,3}$/);

export const telefoneSchema = z.string().regex(/^\d{4,5}[- ]?\d{4}$/);
