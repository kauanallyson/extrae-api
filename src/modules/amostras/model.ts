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
import { createInsertSchema, createSelectSchema } from "drizzle-typebox";
import { type TSchema, t } from "elysia";
import { avaliadores } from "@/modules/avaliadores/model";
import { CEP_PATTERN, TELEFONE_PATTERN } from "@/utils/schemas";
import { spread } from "@/utils/typebox";

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

// Intermediate variables avoid "type instantiation is possibly infinite"
// when nesting drizzle-typebox output inside Elysia schemas.
const insertSchema = createInsertSchema(amostras, {
	cep: t.Nullable(t.String({ pattern: CEP_PATTERN })),
	telefone: t.Nullable(t.String({ pattern: TELEFONE_PATTERN })),
});
const selectSchema = createSelectSchema(amostras);
const selectFields = spread(selectSchema);

const filterSchema = t.Object({
	from: t.Optional(t.String()),
	to: t.Optional(t.String()),
	municipio: t.Optional(t.String()),
	uf: t.Optional(t.String({ minLength: 2, maxLength: 2 })),
	valorImovelMin: t.Optional(t.Number()),
	valorImovelMax: t.Optional(t.Number()),
	valorTerrenoMin: t.Optional(t.Number()),
	valorTerrenoMax: t.Optional(t.Number()),
});

const optionalNullable = <T extends TSchema>(schema: T) =>
	t.Optional(t.Union([schema, t.Null()], { default: null }));

export const AmostrasModel = {
	select: selectSchema,
	insert: t.Composite([
		t.Partial(t.Omit(insertSchema, ["avaliadorId", "createdAt", "updatedAt"])),
		t.Pick(insertSchema, ["avaliadorId"]),
	]),
	update: t.Partial(t.Omit(insertSchema, ["createdAt", "updatedAt"]), {
		minProperties: 1,
		error: "Informe ao menos um campo para atualizar.",
	}),
	filter: filterSchema,
	planilhaQuery: t.Composite([
		filterSchema,
		t.Object({ fields: t.Optional(t.String()) }),
	]),
	similaresQuery: t.Object({
		raioKm: t.Number({ exclusiveMinimum: 0, default: 5 }),
		limit: t.Integer({ minimum: 1, default: 50 }),
	}),
	similaresAlvo: t.Object({
		coordenadaS: t.String({ minLength: 1, error: "coordenadaS é obrigatório" }),
		coordenadaW: t.String({ minLength: 1, error: "coordenadaW é obrigatório" }),
		areaTerreno: optionalNullable(selectFields.areaTerreno),
		areaConstruida: optionalNullable(selectFields.areaConstruida),
		padraoAcabamento: optionalNullable(selectFields.padraoAcabamento),
		estadoConservacao: optionalNullable(selectFields.estadoConservacao),
		dataReferencia: optionalNullable(selectFields.dataReferencia),
	}),
	pdf: t.Object({
		pdf: t.File({
			maxSize: 10 * 1024 * 1024,
			error: "PDF deve ter no máximo 10MB",
		}),
	}),
	extracted: t.Required(
		t.Omit(insertSchema, ["avaliadorId", "createdAt", "updatedAt"]),
	),
} as const;

export type SelectAmostra = typeof amostras.$inferSelect;
export type AmostrasModel = {
	[K in keyof typeof AmostrasModel]: (typeof AmostrasModel)[K]["static"];
};
