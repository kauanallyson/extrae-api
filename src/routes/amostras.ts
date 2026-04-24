import { desc, eq } from "drizzle-orm";
import { Elysia, t } from "elysia";
import { db } from "@/db";
import {
	amostras,
	amostrasInsertSchema,
	amostrasUpdateSchema,
} from "@/db/schema/amostra";
import { normalizeDocumentFields } from "@/lib/formatting";

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
					.insert(amostras)
					.values(data as typeof amostras.$inferInsert)
					.returning();
				return status(201, result[0]);
			} catch (e) {
				return status(500, { message: "Ocorreu um erro.", error: `${e}` });
			}
		},
		{ body: amostrasInsertSchema },
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
					.update(amostras)
					.set(data as typeof amostras.$inferInsert)

					.where(eq(amostras.id, id))
					.returning();

				if (result.length === 0) {
					return status(404, {
						message: `Amostra com id: ${id} não encontrada`,
					});
				}

				return status(200, result[0]);
			} catch (e) {
				return status(500, { message: "Ocorreu um erro.", error: `${e}` });
			}
		},
		{
			body: amostrasUpdateSchema,
			params: t.Object({
				id: t.Numeric(),
			}),
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
			params: t.Object({
				id: t.Numeric(),
			}),
		},
	);
