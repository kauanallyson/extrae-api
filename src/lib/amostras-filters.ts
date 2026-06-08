import { and, eq, gte, lte, type SQL } from "drizzle-orm";
import { z } from "zod";
import { amostras } from "@/db/schema/amostras";

export const amostrasFilterSchema = z.object({
	from: z.string().optional(),
	to: z.string().optional(),
	municipio: z.string().optional(),
	uf: z.string().length(2).optional(),
	valorImovelMin: z.coerce.number().optional(),
	valorImovelMax: z.coerce.number().optional(),
	valorTerrenoMin: z.coerce.number().optional(),
	valorTerrenoMax: z.coerce.number().optional(),
});

export type AmostrasFilterQuery = z.infer<typeof amostrasFilterSchema>;

function parseDate(value: string | undefined): Date | null | undefined {
	if (value === undefined) return undefined;
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? null : date;
}

export type BuildFiltersResult =
	| { ok: true; where: SQL | undefined }
	| { ok: false; message: string };

export function buildAmostrasFilters(
	query: AmostrasFilterQuery,
): BuildFiltersResult {
	const from = parseDate(query.from);
	const to = parseDate(query.to);
	if (from === null || to === null) {
		return { ok: false, message: "Data invalida em 'from' ou 'to'." };
	}

	const filters: SQL[] = [];
	if (from) filters.push(gte(amostras.createdAt, from));
	if (to) filters.push(lte(amostras.createdAt, to));
	if (query.municipio) filters.push(eq(amostras.municipio, query.municipio));
	if (query.uf) filters.push(eq(amostras.uf, query.uf));
	if (query.valorImovelMin !== undefined)
		filters.push(gte(amostras.valorImovel, query.valorImovelMin));
	if (query.valorImovelMax !== undefined)
		filters.push(lte(amostras.valorImovel, query.valorImovelMax));
	if (query.valorTerrenoMin !== undefined)
		filters.push(gte(amostras.valorTerreno, query.valorTerrenoMin));
	if (query.valorTerrenoMax !== undefined)
		filters.push(lte(amostras.valorTerreno, query.valorTerrenoMax));

	return { ok: true, where: filters.length > 0 ? and(...filters) : undefined };
}
