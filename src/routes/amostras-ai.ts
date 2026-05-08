import { Elysia } from "elysia";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
import { db } from "@/db";
import { amostras, amostrasInsertSchema } from "@/db/schema/amostra";
import { amostrasTextoExtraido } from "@/db/schema/amostra-texto-extraido";
import { openai } from "@/lib/ai/openai";
import { SYSTEM_PROMPT } from "@/lib/ai/prompt";
import { mapDatabaseError } from "@/lib/http";

const aiSchema = amostrasInsertSchema
	.omit({
		avaliadorId: true,
		createdAt: true,
		updatedAt: true,
	})
	.required();

const amostraAiBodySchema = z.object({
	avaliadorId: z.coerce.number().int(),
	amostraText: z.string(),
});

export const amostrasAiRoutes = new Elysia({ prefix: "/amostras/ia" }).post(
	"/",
	async ({ body: { avaliadorId, amostraText }, status }) => {
		const response = await openai.chat.completions.parse({
			model: "gpt-4o-mini",
			temperature: 0, // menos criativo o possível
			messages: [
				{ role: "system", content: SYSTEM_PROMPT },
				{
					role: "user",
					content: `
						==============
						TEXTO DA AMOSTRA
						==============
						${amostraText}`,
				},
			],
			response_format: zodResponseFormat(aiSchema, "amostra_extraido"),
		});

		const message = response.choices[0].message;

		if (message.refusal) {
			return status(400, { message: message.refusal });
		}

		if (!message.parsed) return status(500, { message: "Erro na OpenAI" });

		try {
			const amostra = await db.transaction(async (tx) => {
				const [createdAmostra] = await tx
					.insert(amostras)
					.values(
						amostrasInsertSchema.parse({
							...message.parsed,
							avaliadorId,
						}),
					)
					.returning();

				await tx.insert(amostrasTextoExtraido).values({
					amostraId: createdAmostra.id,
					textoExtraido: amostraText,
				});

				return createdAmostra;
			});

			return { amostraId: amostra.id };
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
	{
		body: amostraAiBodySchema,
	},
);
