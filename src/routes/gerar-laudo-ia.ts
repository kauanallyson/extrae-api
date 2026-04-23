import { Elysia } from "elysia";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
import { db } from "@/db";
import { laudos, laudosInsertSchema } from "@/db/schema/laudo";
import { openai } from "@/lib/ai/openai";
import { SYSTEM_PROMPT } from "@/lib/ai/prompt";
import { isValidCnpj, isValidCpf } from "@/lib/cpf-cnpj";

const aiSchema = laudosInsertSchema.omit({
	createdAt: true,
	updatedAt: true,
});

export const laudoRoutes = new Elysia({ prefix: "/gerar-laudo-ia" }).post(
	"/",
	async ({ body: { profissionalId, laudoText } }) => {
		const response = await openai.chat.completions.create({
			model: "gpt-4o-mini",
			temperature: 0.1, // menos criativo o possivel
			messages: [
				{ role: "system", content: SYSTEM_PROMPT },
				{
					role: "user",
					content: `
						==============\n
						TEXTO DO LAUDO\n
						==============\n
            			${laudoText}`,
				},
			],
			response_format: zodResponseFormat(aiSchema, "laudo_extraido"),
		});

		const text = response.choices[0].message.content;
		if (!text) throw new Error("Erro na OpenAI");

		const aiData = aiSchema.parse(JSON.parse(text));

		// Limpa e valida CPF/CNPJ antes de salvar
		const cleanCpf = aiData.cpf?.replace(/\D/g, "") ?? null;
		const cleanCnpj = aiData.cnpj?.replace(/\D/g, "") ?? null;

		const [laudo] = await db
			.insert(laudos)
			.values({
				...aiData,
				profissionalId,
				cpf: cleanCpf && isValidCpf(cleanCpf) ? cleanCpf : null,
				cnpj: cleanCnpj && isValidCnpj(cleanCnpj) ? cleanCnpj : null,
			})
			.returning();

		return { laudoId: laudo.id };
	},
	{
		body: z.object({
			profissionalId: z.number(),
			laudoText: z.string(),
		}),
	},
);
