import { eq } from "drizzle-orm";
import { Elysia, t } from "elysia";
import { db } from "@/db";
import {
	avaliadores,
	avaliadoresInsertSchema,
	avaliadoresUpdateSchema,
} from "@/db/schema/avaliadores";
import { normalizeDocumentFields } from "@/lib/formatting";

export const avaliadoresRoutes = new Elysia({ prefix: "/avaliadores" })
	.get("/", async () => {
		const result = await db
			.select()
			.from(avaliadores)
			.orderBy(avaliadores.nome);
		return result;
	})
	.get(
		"/:id",
		async ({ params: { id }, status }) => {
			const result = await db
				.select()
				.from(avaliadores)
				.where(eq(avaliadores.id, id))
				.limit(1);

			if (result.length === 0) {
				return status(404, {
					message: `Avaliador com id: ${id} não encontrado`,
				});
			}

			return result[0];
		},
		{
			params: t.Object({
				id: t.Numeric(),
			}),
		},
	)
	.post(
		"/",
		async ({ body, status }) => {
			try {
				const { data, invalidFields } = normalizeDocumentFields(body);

				if (invalidFields.length > 0) {
					return status(400, {
						message: "Dados de documento inválidos",
						invalidFields,
					});
				}

				const result = await db
					.insert(avaliadores)
					.values(data as typeof avaliadores.$inferInsert)
					.returning();
				return status(201, result[0]);
			} catch (e) {
				return status(500, { message: "Ocorreu um erro.", error: `${e}` });
			}
		},
		{ body: avaliadoresInsertSchema },
	)
	.put(
		"/:id",
		async ({ params: { id }, body, status }) => {
			try {
				const { data, invalidFields } = normalizeDocumentFields(body);

				if (invalidFields.length > 0) {
					return status(400, {
						message: "Dados de documento inválidos",
						invalidFields,
					});
				}

				const result = await db
					.update(avaliadores)
					.set(data as typeof avaliadores.$inferInsert)
					.where(eq(avaliadores.id, id))
					.returning();

				if (result.length === 0) {
					return status(404, {
						message: `Avaliador com id: ${id} não encontrado`,
					});
				}

				return status(200, result[0]);
			} catch (e) {
				return status(500, { message: "Ocorreu um erro.", error: `${e}` });
			}
		},
		{
			body: avaliadoresUpdateSchema,
			params: t.Object({
				id: t.Numeric(),
			}),
		},
	)
	.delete(
		"/:id",
		async ({ params: { id }, status }) => {
			const result = await db
				.delete(avaliadores)
				.where(eq(avaliadores.id, id))
				.returning();

			if (result.length === 0) {
				return status(404, {
					message: `Avaliador com id: ${id} não encontrado`,
				});
			}

			return status(200, result[0]);
		},
		{
			params: t.Object({
				id: t.Numeric(),
			}),
		},
	);
