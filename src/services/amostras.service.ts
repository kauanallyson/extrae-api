import { desc, eq } from "drizzle-orm";
import type { z } from "zod";
import { db } from "@/config/db";
import {
	amostras,
	type amostrasInsertSchema,
	type amostrasUpdateSchema,
} from "@/models/amostras.model";
import {
	type amostrasFilterSchema,
	buildAmostrasFilters,
} from "@/utils/amostras-filters";
import { mapDatabaseError } from "@/utils/db-errors";
import { HttpError } from "@/utils/http-error";

type AmostraFilter = z.infer<typeof amostrasFilterSchema>;
type AmostraInsert = z.infer<typeof amostrasInsertSchema>;
type AmostraUpdate = z.infer<typeof amostrasUpdateSchema>;

const WRITE_ERRORS = {
	conflict: "Ja existe uma amostra com estes dados.",
	foreignKey: "O avaliador informado nao existe.",
	invalid: "Os dados da amostra sao invalidos.",
};

function notFound(id: number) {
	return new HttpError(404, {
		message: `Amostra com id: ${id} não encontrada`,
	});
}

export async function listAmostras(filter: AmostraFilter) {
	const filters = buildAmostrasFilters(filter);
	if (!filters.ok) {
		throw new HttpError(400, { message: filters.message });
	}

	return db
		.select()
		.from(amostras)
		.where(filters.where)
		.orderBy(desc(amostras.createdAt));
}

export async function getAmostraById(id: number) {
	const [row] = await db
		.select()
		.from(amostras)
		.where(eq(amostras.id, id))
		.limit(1);

	if (!row) throw notFound(id);
	return row;
}

export async function createAmostra(data: AmostraInsert) {
	try {
		const [row] = await db.insert(amostras).values(data).returning();
		return row;
	} catch (e) {
		const response = mapDatabaseError(e, {
			...WRITE_ERRORS,
			default: "Ocorreu um erro ao salvar a amostra.",
		});
		throw new HttpError(response.status, response.body);
	}
}

export async function updateAmostra(id: number, data: AmostraUpdate) {
	try {
		const [row] = await db
			.update(amostras)
			.set(data)
			.where(eq(amostras.id, id))
			.returning();

		if (!row) throw notFound(id);
		return row;
	} catch (e) {
		if (e instanceof HttpError) throw e;
		const response = mapDatabaseError(e, {
			...WRITE_ERRORS,
			default: "Ocorreu um erro ao atualizar a amostra.",
		});
		throw new HttpError(response.status, response.body);
	}
}

export async function deleteAmostra(id: number) {
	try {
		const [row] = await db
			.delete(amostras)
			.where(eq(amostras.id, id))
			.returning();

		if (!row) throw notFound(id);
		return row;
	} catch (e) {
		if (e instanceof HttpError) throw e;
		const response = mapDatabaseError(e, {
			...WRITE_ERRORS,
			default: "Ocorreu um erro ao remover a amostra.",
		});
		throw new HttpError(response.status, response.body);
	}
}
