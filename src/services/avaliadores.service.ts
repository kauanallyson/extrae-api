import { eq } from "drizzle-orm";
import type { z } from "zod";
import { db } from "@/config/db";
import {
	avaliadores,
	type avaliadoresInsertSchema,
	type avaliadoresUpdateSchema,
} from "@/models/avaliadores.model";
import { mapDatabaseError } from "@/utils/db-errors";
import { HttpError } from "@/utils/http-error";

type AvaliadorInsert = z.infer<typeof avaliadoresInsertSchema>;
type AvaliadorUpdate = z.infer<typeof avaliadoresUpdateSchema>;

function notFound(id: number) {
	return new HttpError(404, {
		message: `Avaliador com id: ${id} não encontrado`,
	});
}

export async function listAvaliadores() {
	return db.select().from(avaliadores).orderBy(avaliadores.id);
}

export async function getAvaliadorById(id: number) {
	const [row] = await db
		.select()
		.from(avaliadores)
		.where(eq(avaliadores.id, id))
		.limit(1);

	if (!row) throw notFound(id);
	return row;
}

export async function createAvaliador(data: AvaliadorInsert) {
	try {
		const [row] = await db.insert(avaliadores).values(data).returning();
		return row;
	} catch (e) {
		const response = mapDatabaseError(e, {
			conflict: "Ja existe um avaliador com estes dados.",
			foreignKey: "Nao foi possivel relacionar este avaliador.",
			invalid: "Os dados do avaliador sao invalidos.",
			default: "Ocorreu um erro ao salvar o avaliador.",
		});
		throw new HttpError(response.status, response.body);
	}
}

export async function updateAvaliador(id: number, data: AvaliadorUpdate) {
	try {
		const [row] = await db
			.update(avaliadores)
			.set(data)
			.where(eq(avaliadores.id, id))
			.returning();

		if (!row) throw notFound(id);
		return row;
	} catch (e) {
		if (e instanceof HttpError) throw e;
		const response = mapDatabaseError(e, {
			conflict: "Ja existe um avaliador com estes dados.",
			foreignKey: "Nao foi possivel relacionar este avaliador.",
			invalid: "Os dados do avaliador sao invalidos.",
			default: "Ocorreu um erro ao atualizar o avaliador.",
		});
		throw new HttpError(response.status, response.body);
	}
}

export async function deleteAvaliador(id: number) {
	try {
		const [row] = await db
			.delete(avaliadores)
			.where(eq(avaliadores.id, id))
			.returning();

		if (!row) throw notFound(id);
		return row;
	} catch (e) {
		if (e instanceof HttpError) throw e;
		const response = mapDatabaseError(e, {
			conflict: "Ja existe um avaliador com estes dados.",
			foreignKey:
				"Nao foi possivel remover este avaliador pois possui amostras vinculadas.",
			invalid: "Os dados do avaliador sao invalidos.",
			default: "Ocorreu um erro ao remover o avaliador.",
		});
		throw new HttpError(response.status, response.body);
	}
}
