import { zodResponseFormat } from "openai/helpers/zod";
import { amostrasInsertSchema } from "@/models/amostras.model";
import { openai } from "@/services/openai.service";
import { SYSTEM_PROMPT } from "@/utils/prompt";
import { HttpError } from "@/utils/http-error";

const aiSchema = amostrasInsertSchema.omit({
	avaliadorId: true,
	createdAt: true,
	updatedAt: true,
});

const PDF_MAGIC = Buffer.from([0x25, 0x50, 0x44, 0x46]);

export async function extractAmostraFromPdf(file: Express.Multer.File) {
	if (file.mimetype !== "application/pdf") {
		throw new HttpError(400, { message: "O arquivo deve ser um pdf" });
	}
	if (!file.buffer.subarray(0, 4).equals(PDF_MAGIC)) {
		throw new HttpError(400, { message: "O arquivo deve ser um pdf válido" });
	}

	const base64 = file.buffer.toString("base64");

	const response = await openai.chat.completions.parse({
		model: "gpt-4o",
		temperature: 0,
		messages: [
			{ role: "system", content: SYSTEM_PROMPT },
			{
				role: "user",
				content: [
					{
						type: "file",
						file: {
							filename: file.originalname ?? "document.pdf",
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
		throw new HttpError(400, { message: message.refusal });
	}
	if (!message.parsed) {
		throw new HttpError(500, { message: "Erro na OpenAI" });
	}

	return message.parsed;
}
