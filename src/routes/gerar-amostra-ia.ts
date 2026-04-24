import { Value } from "@sinclair/typebox/value";
import { Elysia, type Static, t } from "elysia";
import { db } from "@/db";
import { amostras, amostrasInsertSchema } from "@/db/schema/amostra";
import { openai } from "@/lib/ai/openai";
import { SYSTEM_PROMPT } from "@/lib/ai/prompt";
import {
	formatCep,
	formatCnpj,
	formatCpf,
	isValidCep,
	isValidCnpj,
	isValidCpf,
} from "@/lib/formatting";

const aiSchema = t.Omit(amostrasInsertSchema, ["avaliadorId"]);

export const amostraRoutes = new Elysia({ prefix: "/gerar-amostra-ia" }).post(
	"/",
	async ({ body: { avaliadorId, amostraText } }) => {
		const response = await openai.chat.completions.create({
			model: "gpt-4o-mini",
			temperature: 0.1, // menos criativo o possivel
			messages: [
				{ role: "system", content: SYSTEM_PROMPT },
				{
					role: "user",
					content: `
						==============\n
						TEXTO DO AMOSTRA\n
						==============\n
            			${amostraText}`,
				},
			],
			response_format: {
				type: "json_schema",
				json_schema: {
					name: "amostra_extraido",
					schema: aiSchema as Record<string, unknown>,
				},
			},
		});

		const text = response.choices[0].message.content;
		if (!text) throw new Error("Erro na OpenAI");

		const parsed = JSON.parse(text);
		const aiData = Value.Decode(aiSchema, parsed) as Static<typeof aiSchema>;

		const [amostra] = await db
			.insert(amostras)
			.values({
				...aiData,
				avaliadorId,
				cpf:
					aiData.cpf && isValidCpf(aiData.cpf) ? formatCpf(aiData.cpf) : null,
				cnpj:
					aiData.cnpj && isValidCnpj(aiData.cnpj)
						? formatCnpj(aiData.cnpj)
						: null,
				cep:
					aiData.cep && isValidCep(aiData.cep) ? formatCep(aiData.cep) : null,
			})
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
