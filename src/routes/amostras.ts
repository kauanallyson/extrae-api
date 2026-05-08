import { desc, eq } from "drizzle-orm";
import { Elysia } from "elysia";
import { db } from "@/db";
import {
	amostras,
	amostrasInsertSchema,
	amostrasUpdateSchema,
} from "@/db/schema/amostra";
import { mapDatabaseError } from "@/lib/http";
import { idParamsSchema } from "@/lib/schemas";

export const amostrasRoutes = new Elysia({ prefix: "/amostras" })
	.get("/", async () => {
		const result = await db
			.select()
			.from(amostras)
			.orderBy(desc(amostras.createdAt));
		return result;
	})
	.get(
		"/:id",
		async ({ params: { id }, status }) => {
			const result = await db
				.select()
				.from(amostras)
				.where(eq(amostras.id, id))
				.limit(1);

			if (result.length === 0) {
				return status(404, {
					message: `Amostra com id: ${id} não encontrada`,
				});
			}

			return result[0];
		},
		{
			params: idParamsSchema,
		},
	)
	.post(
		"/",
		async ({ body, status }) => {
			try {
				const result = await db
					.insert(amostras)
					.values(amostrasInsertSchema.parse(body))
					.returning();
				return status(201, result[0]);
			} catch (e) {
				const response = mapDatabaseError(e, {
					conflict: "Ja existe uma amostra com estes dados.",
					foreignKey: "O avaliador informado nao existe.",
					invalid: "Os dados da amostra sao invalidos.",
					default: "Ocorreu um erro ao salvar a amostra.",
				});
				return status(response.status, response.body);
			}
		},
		{ body: amostrasInsertSchema },
	)
	.put(
		"/:id",
		async ({ params: { id }, body, status }) => {
			try {
				const result = await db
					.update(amostras)
					.set(amostrasUpdateSchema.parse(body))
					.where(eq(amostras.id, id))
					.returning();

				if (result.length === 0) {
					return status(404, {
						message: `Amostra com id: ${id} não encontrada`,
					});
				}

				return status(200, result[0]);
			} catch (e) {
				const response = mapDatabaseError(e, {
					conflict: "Ja existe uma amostra com estes dados.",
					foreignKey: "O avaliador informado nao existe.",
					invalid: "Os dados da amostra sao invalidos.",
					default: "Ocorreu um erro ao atualizar a amostra.",
				});
				return status(response.status, response.body);
			}
		},
		{
			body: amostrasUpdateSchema,
			params: idParamsSchema,
		},
	)
	.delete(
		"/:id",
		async ({ params: { id }, status }) => {
			const result = await db
				.delete(amostras)
				.where(eq(amostras.id, id))
				.returning();

			if (result.length === 0) {
				return status(404, {
					message: `Amostra com id: ${id} não encontrada`,
				});
			}

			return status(200, result[0]);
		},
		{
			params: idParamsSchema,
		},
	);
