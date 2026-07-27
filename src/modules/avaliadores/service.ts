import { and, eq, ne } from "drizzle-orm";
import { status } from "elysia";
import { db } from "@/config/db";
import { normalizeDocumentos } from "@/utils/normalize";
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
		const values = normalizeDocumentos(data);
		if (values.cpf && (await Avaliadores.cpfExists(values.cpf))) {
			throw status(409, { message: "Ja existe um avaliador com este CPF." });
		}
		if (values.cnpj && (await Avaliadores.cnpjExists(values.cnpj))) {
			throw status(409, { message: "Ja existe um avaliador com este CNPJ." });
		}

		const [row] = await db.insert(avaliadores).values(values).returning();
		if (!row) {
			throw status(500, { message: "Ocorreu um erro ao salvar o avaliador." });
		}
		return row;
	}

	static async update(
		id: number,
		data: AvaliadoresModel["update"],
	): Promise<AvaliadorSelect> {
		const values = normalizeDocumentos(data);
		if (values.cpf && (await Avaliadores.cpfExists(values.cpf, id))) {
			throw status(409, { message: "Ja existe um avaliador com este CPF." });
		}
		if (values.cnpj && (await Avaliadores.cnpjExists(values.cnpj, id))) {
			throw status(409, { message: "Ja existe um avaliador com este CNPJ." });
		}

		const [row] = await db
			.update(avaliadores)
			.set(values)
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

	private static cpfExists(cpf: string, excludeId?: number): Promise<boolean> {
		return Avaliadores.documentoExists(avaliadores.cpf, cpf, excludeId);
	}

	private static cnpjExists(
		cnpj: string,
		excludeId?: number,
	): Promise<boolean> {
		return Avaliadores.documentoExists(avaliadores.cnpj, cnpj, excludeId);
	}

	private static async documentoExists(
		column: typeof avaliadores.cpf | typeof avaliadores.cnpj,
		value: string,
		excludeId?: number,
	): Promise<boolean> {
		const clash = eq(column, value);
		const where =
			excludeId === undefined
				? clash
				: and(clash, ne(avaliadores.id, excludeId));

		const [row] = await db
			.select({ id: avaliadores.id })
			.from(avaliadores)
			.where(where)
			.limit(1);
		return !!row;
	}
}
