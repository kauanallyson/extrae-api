import { and, eq, ne, or, type SQL } from "drizzle-orm";
import { status } from "elysia";
import { db } from "@/config/db";
import {
	type AvaliadoresModel,
	type AvaliadorSelect,
	avaliadores,
} from "./model";

function notFound(id: number): never {
	throw status(404, { message: `Avaliador ${id} nao encontrado.` });
}

export abstract class Avaliadores {
	static async list(): Promise<AvaliadorSelect[]> {
		return db.select().from(avaliadores).orderBy(avaliadores.id);
	}

	static async getById(id: number): Promise<AvaliadorSelect> {
		const [row] = await db
			.select()
			.from(avaliadores)
			.where(eq(avaliadores.id, id))
			.limit(1);

		if (!row) notFound(id);
		return row;
	}

	static async exists(id: number): Promise<boolean> {
		const [row] = await db
			.select({ id: avaliadores.id })
			.from(avaliadores)
			.where(eq(avaliadores.id, id))
			.limit(1);
		return !!row;
	}

	static async create(
		data: AvaliadoresModel["insert"],
	): Promise<AvaliadorSelect> {
		await Avaliadores.ensureCpfCnpjDisponiveis(data);

		const [row] = await db.insert(avaliadores).values(data).returning();
		if (!row) {
			throw status(500, { message: "Ocorreu um erro ao salvar o avaliador." });
		}
		return row;
	}

	static async update(
		id: number,
		data: AvaliadoresModel["update"],
	): Promise<AvaliadorSelect> {
		await Avaliadores.ensureCpfCnpjDisponiveis(data, id);

		const [row] = await db
			.update(avaliadores)
			.set(data)
			.where(eq(avaliadores.id, id))
			.returning();

		if (!row) notFound(id);
		return row;
	}

	static async remove(id: number): Promise<AvaliadorSelect> {
		const [row] = await db
			.delete(avaliadores)
			.where(eq(avaliadores.id, id))
			.returning();

		if (!row) notFound(id);
		return row;
	}

	private static async ensureCpfCnpjDisponiveis(
		data: { cpf?: string; cnpj?: string },
		excludeId?: number,
	): Promise<void> {
		const clashes: SQL[] = [];
		if (data.cpf) clashes.push(eq(avaliadores.cpf, data.cpf));
		if (data.cnpj) clashes.push(eq(avaliadores.cnpj, data.cnpj));
		if (clashes.length === 0) return;

		const conflict = or(...clashes);
		const where =
			excludeId === undefined
				? conflict
				: and(conflict, ne(avaliadores.id, excludeId));

		const [row] = await db
			.select({ id: avaliadores.id })
			.from(avaliadores)
			.where(where)
			.limit(1);

		if (row) {
			throw status(409, {
				message: "Ja existe um avaliador com este CPF ou CNPJ.",
			});
		}
	}
}
