import { eq } from "drizzle-orm";
import { db } from "@/config/db";
import {
	type AvaliadorInsert,
	type AvaliadorSelect,
	type AvaliadorUpdate,
	avaliadores,
} from "@/models/avaliadores.model";

export async function findAll(): Promise<AvaliadorSelect[]> {
	return db.select().from(avaliadores).orderBy(avaliadores.id);
}

export async function findById(id: number): Promise<AvaliadorSelect | null> {
	const [row] = await db
		.select()
		.from(avaliadores)
		.where(eq(avaliadores.id, id))
		.limit(1);

	if (!row) return null;
	return row;
}

export async function existsByCpf(cpf: string): Promise<boolean> {
	const [row] = await db
		.select()
		.from(avaliadores)
		.where(eq(avaliadores.cpf, cpf))
		.limit(1);
	return !!row;
}

export async function existsByCnpj(cnpj: string): Promise<boolean> {
	const [row] = await db
		.select()
		.from(avaliadores)
		.where(eq(avaliadores.cnpj, cnpj))
		.limit(1);
	return !!row;
}

export async function createAvaliador(
	avaliadorRequest: AvaliadorInsert,
): Promise<AvaliadorSelect | null> {
	const [row] = await db
		.insert(avaliadores)
		.values(avaliadorRequest)
		.returning();
	return row;
}

export async function updateAvaliador(
	id: number,
	avaliadorRequest: AvaliadorUpdate,
): Promise<AvaliadorSelect | null> {
	const [row] = await db
		.update(avaliadores)
		.set(avaliadorRequest)
		.where(eq(avaliadores.id, id))
		.returning();
	return row;
}

export async function deleteById(id: number): Promise<AvaliadorSelect | null> {
	const [row] = await db
		.delete(avaliadores)
		.where(eq(avaliadores.id, id))
		.returning();
	return row;
}
