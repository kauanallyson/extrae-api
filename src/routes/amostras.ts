import { desc, eq } from "drizzle-orm";
import { Elysia, t } from "elysia";
import { db } from "@/db";
import {
	amostras,
	amostrasInsertSchema,
	amostrasUpdateSchema,
} from "@/db/schema/amostra";
import {
	formatCep,
	formatCnpj,
	formatCpf,
	isValidCep,
	isValidCnpj,
	isValidCpf,
} from "@/lib/formatting";

export const amostrasRoutes = new Elysia({ prefix: "/amostras" })
	// get all
	.get("/", async () => {
		const result = await db
			.select()
			.from(amostras)
			.orderBy(desc(amostras.createdAt));
		return result;
	})
	// find by id
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
					message: `Amostra com id: ${id} não encontrado`,
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
	// create amostra
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
				if (body.cep) {
					if (!isValidCep(body.cep))
						return status(400, { message: "CEP inválido" });
					body.cep = formatCep(body.cep);
				}
				const result = await db.insert(amostras).values(body).returning();
				return status(201, result[0]);
			} catch (e) {
				return status(500, { message: "Ocorreu um erro.", error: `${e}` });
			}
		},
		{ body: amostrasInsertSchema },
	)
	// update amostra
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
				if (body.cep) {
					if (!isValidCep(body.cep))
						return status(400, { message: "CEP inválido" });
					body.cep = formatCep(body.cep);
				}
				const result = await db
					.update(amostras)
					.set(body)
					.where(eq(amostras.id, id))
					.returning();
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
	// delete amostra
	.delete(
		"/:id",
		async ({ params: { id }, status }) => {
			const result = await db
				.delete(amostras)
				.where(eq(amostras.id, id))
				.returning();
			if (result.length === 0) {
				return status(404, {
					message: `Amostra com id: ${id} não encontrado`,
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
