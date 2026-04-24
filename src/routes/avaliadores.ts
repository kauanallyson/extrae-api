import { eq } from "drizzle-orm";
import { Elysia, t } from "elysia";
import { db } from "@/db";
import {
	avaliadores,
	avaliadoresInsertSchema,
	avaliadoresUpdateSchema,
} from "@/db/schema/avaliadores";
import {
	formatCnpj,
	formatCpf,
	isValidCnpj,
	isValidCpf,
} from "@/lib/formatting";

export const avaliadoresRoutes = new Elysia({ prefix: "/avaliadores" })
	// get all
	.get("/", async () => {
		const result = await db
			.select()
			.from(avaliadores)
			.orderBy(avaliadores.nome);
		return result;
	})
	// find by id
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
	// create avaliador
	.post(
		"/",
		async ({ body, status }) => {
			try {
				if (body.cpf) {
					if (!isValidCpf(body.cpf))
						return status(400, { message: "CPF inválido" });
					body.cpf = formatCpf(body.cpf);
				}
				if (body.cnpj) {
					if (!isValidCnpj(body.cnpj))
						return status(400, { message: "CNPJ inválido" });
					body.cnpj = formatCnpj(body.cnpj);
				}
				const result = await db.insert(avaliadores).values(body).returning();
				return status(201, result[0]);
			} catch (e) {
				return status(500, { message: "Ocorreu um erro.", error: `${e}` });
			}
		},
		{ body: avaliadoresInsertSchema },
	)
	// update avaliador
	.put(
		"/:id",
		async ({ params: { id }, body, status }) => {
			try {
				if (body.cpf) {
					if (!isValidCpf(body.cpf))
						return status(400, { message: "CPF inválido" });
					body.cpf = formatCpf(body.cpf);
				}
				if (body.cnpj) {
					if (!isValidCnpj(body.cnpj))
						return status(400, { message: "CNPJ inválido" });
					body.cnpj = formatCnpj(body.cnpj);
				}
				const result = await db
					.update(avaliadores)
					.set(body)
					.where(eq(avaliadores.id, id))
					.returning();
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
	// delete avaliador
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
