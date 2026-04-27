import { Value } from "@sinclair/typebox/value";
import { Elysia, type Static, t } from "elysia";
import { db } from "@/db";
import { amostras, amostrasInsertSchema } from "@/db/schema/amostra";
import { openai } from "@/lib/ai/openai";
import { SYSTEM_PROMPT } from "@/lib/ai/prompt";
import { normalizeDocumentFields } from "@/lib/formatting";

const aiSchema = t.Omit(amostrasInsertSchema, [
	"avaliadorId",
	"textoExtraido",
	"createdAt",
	"updatedAt",
]);
const aiResponseSchema = {
	...aiSchema,
	required: Object.keys(aiSchema.properties ?? {}),
	additionalProperties: false,
} as Record<string, unknown>;

export const amostrasAiRoutes = new Elysia({ prefix: "/amostras/ia" }).post(
	"/",
	async ({ body: { avaliadorId, amostraText }, status }) => {
		const response = await openai.chat.completions.create({
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
			response_format: {
				type: "json_schema",
				json_schema: {
					name: "amostra_extraido",
					schema: aiResponseSchema,
					strict: true,
				},
			},
		});

		const text = response.choices[0].message.content;
		if (!text) return status(500, { message: "Erro na OpenAI" });

		const parsed = JSON.parse(text);
		const aiData = Value.Decode(aiSchema, parsed) as Static<typeof aiSchema>;
		const { data, invalidFields } = normalizeDocumentFields(aiData);

		if (invalidFields.length > 0) {
			return status(400, {
				message: "Dados de documento inválidos",
				invalidFields,
			});
		}

		const [amostra] = await db
			.insert(amostras)
			.values(
				Value.Decode(amostrasInsertSchema, {
					...data,
					avaliadorId,
					textoExtraido: amostraText,
				}),
			)
			.returning();

		return { amostraId: amostra.id };
	},
	{
		body: t.Object({
			avaliadorId: t.Numeric(),
			amostraText: t.String(),
		}),
	},
);
