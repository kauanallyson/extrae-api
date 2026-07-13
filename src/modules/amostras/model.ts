import {
	char,
	integer,
	numeric,
	pgEnum,
	pgTable,
	text,
	timestamp,
	varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { avaliadores } from "@/modules/avaliadores/model";

export const padraoAcabamentoEnum = pgEnum("padrao_acabamento", [
	"Mínimo",
	"Baixo",
	"Normal (c/ aspectos de baixo)",
	"Normal (forte predominância)",
	"Normal (c/ aspectos de alto)",
	"Alto (por predominância)",
	"Alto (superior, luxo)",
]);

export const estadoConservacaoEnum = pgEnum("estado_conservacao", [
	"Em construção ou na planta",
	"Bom (aparência de novo)",
	"Bom (aparência de usado)",
	"Regular (reparos simples)",
	"Regular (reparos importantes)",
	"Ruim",
]);

export const amostras = pgTable("amostras", {
	id: integer().primaryKey().generatedAlwaysAsIdentity(),
	avaliadorId: integer()
		.references(() => avaliadores.id)
		.notNull(),
	proponente: text(),
	cpf: char({ length: 14 }),
	cnpj: char({ length: 18 }),
	ddd: varchar({ length: 3 }),
	telefone: varchar({ length: 9 }),
	endereco: text(),
	coordenadaS: text(),
	coordenadaW: text(),
	complemento: text(),
	bairro: text(),
	cep: char({ length: 9 }),
	municipio: text(),
	uf: char({ length: 2 }),
	empresaResponsavel: text(),
	valorTerreno: numeric({ precision: 14, scale: 2, mode: "number" }),
	matricula: text(),
	oficio: text(),
	comarca: text(),
	ufMatricula: char({ length: 2 }),
	valorImovel: numeric({ precision: 14, scale: 2, mode: "number" }),
	incidencias: numeric({ precision: 14, scale: 2, mode: "number" }).array(),
	acumuladoProposto: numeric({
		precision: 14,
		scale: 2,
		mode: "number",
	}).array(),
	numeroEtapas: integer(),
	valorUnitario: numeric({ precision: 14, scale: 2, mode: "number" }),
	testada: numeric({ precision: 14, scale: 2, mode: "number" }),
	idadeEstimada: text(),
	areaTerreno: numeric({ precision: 14, scale: 2, mode: "number" }),
	areaConstruida: numeric({ precision: 14, scale: 2, mode: "number" }),
	quartos: integer(),
	banheiros: integer(),
	suites: integer(),
	vagas: integer(),
	padraoAcabamento: padraoAcabamentoEnum(),
	estadoConservacao: estadoConservacaoEnum(),
	infraestrutura: text(),
	servicosPublicos: text(),
	usosPredominantes: text(),
	viaAcesso: text(),
	regiaoContexto: text(),
	dataReferencia: text(),
	createdAt: timestamp().defaultNow().notNull(),
	updatedAt: timestamp()
		.defaultNow()
		.$onUpdateFn(() => new Date())
		.notNull(),
});

const stripNonDigits = (value: unknown): unknown =>
	typeof value === "string" ? value.replace(/\D/g, "") : value;

const normalizeCep = (value: unknown): unknown => {
	if (typeof value !== "string") return value;
	const digits = value.replace(/\D/g, "");
	return digits.length === 8
		? `${digits.slice(0, 5)}-${digits.slice(5)}`
		: value;
};

export const selectAmostraSchema = createSelectSchema(amostras);
export const insertAmostraSchema = createInsertSchema(amostras, {
	cep: (schema) => z.preprocess(normalizeCep, schema),
	telefone: (schema) => z.preprocess(stripNonDigits, schema),
})
	.omit({
		createdAt: true,
		updatedAt: true,
	})
	.partial()
	.required({ avaliadorId: true });
export const updateAmostraSchema = insertAmostraSchema
	.partial()
	.refine((data) => Object.keys(data).length > 0, {
		message: "Informe ao menos um campo para atualizar.",
	});

const amostrasFilterSchema = z.object({
	from: z.string().optional(),
	to: z.string().optional(),
	municipio: z.string().optional(),
	uf: z.string().length(2).optional(),
	valorImovelMin: z.coerce.number().optional(),
	valorImovelMax: z.coerce.number().optional(),
	valorTerrenoMin: z.coerce.number().optional(),
	valorTerrenoMax: z.coerce.number().optional(),
});

function optionalNullable<T extends z.ZodTypeAny>(schema: T) {
	return schema
		.nullable()
		.optional()
		.transform((value) => value ?? null);
}

export const AmostrasModel = {
	insert: insertAmostraSchema,
	update: updateAmostraSchema,
	filter: amostrasFilterSchema,
	planilhaQuery: amostrasFilterSchema.extend({
		fields: z.string().optional(),
	}),
	similaresQuery: z.object({
		raioKm: z.coerce.number().positive().default(5),
		limit: z.coerce.number().int().positive().default(50),
	}),
	similaresAlvo: z.object({
		coordenadaS: z.string().min(1, "coordenadaS é obrigatório"),
		coordenadaW: z.string().min(1, "coordenadaW é obrigatório"),
		areaTerreno: optionalNullable(z.number()),
		areaConstruida: optionalNullable(z.number()),
		padraoAcabamento: optionalNullable(z.enum(padraoAcabamentoEnum.enumValues)),
		estadoConservacao: optionalNullable(
			z.enum(estadoConservacaoEnum.enumValues),
		),
		dataReferencia: optionalNullable(z.string()),
	}),
	pdf: z.object({
		pdf: z.file().max(10 * 1024 * 1024, "PDF deve ter no máximo 10MB"),
	}),
} as const;

export type SelectAmostra = z.infer<typeof selectAmostraSchema>;
export type InsertAmostra = z.infer<typeof insertAmostraSchema>;
export type UpdateAmostra = z.infer<typeof updateAmostraSchema>;
export type AmostrasModel = {
	[K in keyof typeof AmostrasModel]: z.infer<(typeof AmostrasModel)[K]>;
};
