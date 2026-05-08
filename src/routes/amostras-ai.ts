import { Elysia } from "elysia";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
import { amostrasInsertSchema } from "@/db/schema/amostra";
import { openai } from "@/lib/ai/openai";
import { SYSTEM_PROMPT } from "@/lib/ai/prompt";

const aiSchema = amostrasInsertSchema
	.omit({
		avaliadorId: true,
		createdAt: true,
		updatedAt: true,
	})
	.required();

const amostraAiBodySchema = z.object({
	amostraText: z.string(),
});

export const amostrasAiRoutes = new Elysia({ prefix: "/amostras/ia" }).post(
	"/",
	async ({ body: { amostraText }, status }) => {
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

		return message.parsed;
	},
	{
		body: amostraAiBodySchema,
	},
);
