import { and, desc, eq, isNotNull, ne, type SQL } from "drizzle-orm";
import { db } from "@/config/db";
import {
	amostras,
	type InsertAmostra,
	type SelectAmostra,
	type UpdateAmostra,
} from "@/models/amostras.model";

export async function findAll(where?: SQL): Promise<SelectAmostra[]> {
	return db
		.select()
		.from(amostras)
		.where(where)
		.orderBy(desc(amostras.createdAt));
}

export async function findById(id: number): Promise<SelectAmostra | null> {
	const [row] = await db
		.select()
		.from(amostras)
		.where(eq(amostras.id, id))
		.limit(1);

	if (!row) return null;
	return row;
}

export async function findSimilaresCandidates(
	excludeId?: number,
): Promise<SelectAmostra[]> {
	const conditions = [
		isNotNull(amostras.coordenadaS),
		isNotNull(amostras.coordenadaW),
		isNotNull(amostras.valorImovel),
		isNotNull(amostras.valorTerreno),
	];
	if (excludeId !== undefined) conditions.push(ne(amostras.id, excludeId));

	return db
		.select()
		.from(amostras)
		.where(and(...conditions));
}

export async function createAmostra(
	data: InsertAmostra,
): Promise<SelectAmostra | null> {
	const [row] = await db.insert(amostras).values(data).returning();
	return row;
}

export async function updateAmostra(
	id: number,
	data: UpdateAmostra,
): Promise<SelectAmostra | null> {
	const [row] = await db
		.update(amostras)
		.set(data)
		.where(eq(amostras.id, id))
		.returning();
	return row ?? null;
}

export async function deleteById(id: number): Promise<SelectAmostra | null> {
	const [row] = await db
		.delete(amostras)
		.where(eq(amostras.id, id))
		.returning();
	return row ?? null;
}
