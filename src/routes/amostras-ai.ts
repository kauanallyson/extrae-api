import { Elysia, fileType } from "elysia";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
import { amostrasInsertSchema } from "@/db/schema/amostras";
import { openai } from "@/lib/ai/openai";
import { SYSTEM_PROMPT } from "@/lib/ai/prompt";

const aiSchema = amostrasInsertSchema
	.omit({
		avaliadorId: true,
		createdAt: true,
		updatedAt: true,
	})
	.required();

export const amostrasAiRoutes = new Elysia({ prefix: "/amostras/ia" }).post(
	"/",
	async ({ body: { pdf }, status }) => {
		const buffer = Buffer.from(await pdf.arrayBuffer());
		const base64 = buffer.toString("base64");

		const response = await openai.chat.completions.parse({
			model: "gpt-4o-mini",
			temperature: 0,
			messages: [
				{ role: "system", content: SYSTEM_PROMPT },
				{
					role: "user",
					content: [
						{
							type: "file",
							file: {
								filename: pdf.name ?? "document.pdf",
								file_data: `data:application/pdf;base64,${base64}`,
							},
						},
					],
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
		body: z.object({
			pdf: z
				.file()
				.refine(
					(file) => fileType(file, "application/pdf"),
					"O arquivo deve ser um pdf",
				),
		}),
	},
);
