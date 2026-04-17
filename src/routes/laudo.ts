import Elysia from "elysia";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
import { openai } from "../lib/openai";
import { SYSTEM_PROMPT } from "../lib/prompt";

const laudoSchema = z.object({
	// dados para rae
	proponente: z.string(),
	cpf_cnpj: z.string(),
	ddd: z.string(),
	telefone: z.string(),
	endereco_literal: z.string(),
	coordenada_s: z.string(),
	coordenada_w: z.string(),
	complemento: z.string(),
	bairro: z.string(),
	cep: z.string(),
	municipio: z.string(),
	uf: z.string(),
	empresa_responsavel: z.string(),
	valor_terreno: z.number(),
	matricula: z.string(),
	oficio: z.string(),
	comarca: z.string(),
	uf_matricula: z.string(),
	incidencias: z.array(z.number()),
	valor_imovel: z.number(),
	numero_etapas: z.number(),
	acumulado_proposto: z.array(z.number()),

	// dados para amostra
	valor_unitario: z.number(),
	testada: z.number(),
	idade_estimada: z.string(),
	area_terreno: z.number(),
	area_construida: z.number(),
	quartos: z.number(),
	banheiros: z.number(),
	suites: z.number(),
	vagas: z.number(),
	padrao_acabamento: z.string(),
	estado_conservacao: z.string(),
	infraestrutura: z.string(),
	servicos_publicos: z.string(),
	usos_predominantes: z.string(),
	via_acesso: z.string(),
	regiao_contexto: z.string(),
	data_referencia: z.string(),
});

export type LaudoExtraido = z.infer<typeof laudoSchema>;

export const laudoRoutes = new Elysia({ prefix: "/gerar-laudo-ia" }).post(
	"/",
	async ({ body: { laudoText } }) => {
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
                    ${laudoText}
                    `,
				},
			],
			response_format: zodResponseFormat(laudoSchema, "laudo_extraido"),
		});
		const text = response.choices[0].message.content;
		if (!text) throw new Error("Erro na OpenAI");

		const result = laudoSchema.parse(JSON.parse(text));
		return result;
	},
	{
		body: z.object({
			laudoText: z.string(),
		}),
	},
);
