import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
import { openai } from "@/services/openai.service";
import { HttpError } from "@/utils/http-error";
import { SYSTEM_PROMPT } from "@/utils/prompt";
import {
	cepSchema,
	cnpjSchema,
	cpfSchema,
	dddSchema,
	telefoneSchema,
} from "@/utils/schemas";

const empty = z.literal("");

const aiSchema = z.object({
	proponente: z.string(),
	cpf: cpfSchema.or(empty),
	cnpj: cnpjSchema.or(empty),
	ddd: dddSchema.or(empty),
	telefone: telefoneSchema.or(empty),
	endereco: z.string(),
	coordenadaS: z.string(),
	coordenadaW: z.string(),
	complemento: z.string(),
	bairro: z.string(),
	cep: cepSchema.or(empty),
	municipio: z.string(),
	uf: z.string(),
	empresaResponsavel: z.string(),
	valorTerreno: z.number(),
	matricula: z.string(),
	oficio: z.string(),
	comarca: z.string(),
	ufMatricula: z.string(),
	valorImovel: z.number(),
	incidencias: z.array(z.number()),
	numeroEtapas: z.number(),
	acumuladoProposto: z.array(z.number()),
	valorUnitario: z.number(),
	testada: z.number(),
	idadeEstimada: z.string(),
	areaTerreno: z.number(),
	areaConstruida: z.number(),
	quartos: z.number(),
	banheiros: z.number(),
	suites: z.number(),
	vagas: z.number(),
	padraoAcabamento: z.string(),
	estadoConservacao: z.string(),
	infraestrutura: z.string(),
	servicosPublicos: z.string(),
	usosPredominantes: z.string(),
	viaAcesso: z.string(),
	regiaoContexto: z.string(),
	dataReferencia: z.string(),
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

	const choice = response.choices?.[0];
	if (!choice) {
		throw new HttpError(500, { message: "Erro na OpenAI" });
	}

	const message = choice.message;

	if (message.refusal) {
		throw new HttpError(400, { message: message.refusal });
	}
	if (!message.parsed) {
		throw new HttpError(500, { message: "Erro na OpenAI" });
	}

	return message.parsed;
}
