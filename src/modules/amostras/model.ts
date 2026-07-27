import { relations } from "drizzle-orm";
import {
	char,
	doublePrecision,
	integer,
	pgEnum,
	pgTable,
	text,
	timestamp,
	unique,
	varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-typebox";
import { t } from "elysia";
import { avaliadores } from "@/modules/avaliadores/model";
import {
	CEP_REGEX,
	CNPJ_REGEX,
	CPF_REGEX,
	TELEFONE_REGEX,
} from "@/utils/regex";

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
	valorTerreno: doublePrecision(),
	matricula: text(),
	oficio: text(),
	comarca: text(),
	ufMatricula: char({ length: 2 }),
	valorImovel: doublePrecision(),
	numeroEtapas: integer(),
	valorUnitario: doublePrecision(),
	testada: doublePrecision(),
	idadeEstimada: text(),
	areaTerreno: doublePrecision(),
	areaConstruida: doublePrecision(),
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
	equacaoSISDEA: text(),
	dataReferencia: text(),
	createdAt: timestamp().defaultNow().notNull(),
	updatedAt: timestamp()
		.defaultNow()
		.$onUpdateFn(() => new Date())
		.notNull(),
});

export const incidencias = pgTable(
	"incidencias",
	{
		id: integer().primaryKey().generatedAlwaysAsIdentity(),
		amostraId: integer()
			.references(() => amostras.id, { onDelete: "cascade" })
			.notNull(),
		ordem: integer().notNull(),
		percentual: doublePrecision().notNull(),
	},
	(table) => [unique().on(table.amostraId, table.ordem)],
);

export const acumuladosPropostos = pgTable(
	"acumulados_propostos",
	{
		id: integer().primaryKey().generatedAlwaysAsIdentity(),
		amostraId: integer()
			.references(() => amostras.id, { onDelete: "cascade" })
			.notNull(),
		ordem: integer().notNull(),
		percentual: doublePrecision().notNull(),
	},
	(table) => [unique().on(table.amostraId, table.ordem)],
);

export const amostrasRelations = relations(amostras, ({ one, many }) => ({
	avaliador: one(avaliadores, {
		fields: [amostras.avaliadorId],
		references: [avaliadores.id],
	}),
	incidencias: many(incidencias),
	acumuladosPropostos: many(acumuladosPropostos),
}));

export const incidenciasRelations = relations(incidencias, ({ one }) => ({
	amostra: one(amostras, {
		fields: [incidencias.amostraId],
		references: [amostras.id],
	}),
}));

export const acumuladosPropostosRelations = relations(
	acumuladosPropostos,
	({ one }) => ({
		amostra: one(amostras, {
			fields: [acumuladosPropostos.amostraId],
			references: [amostras.id],
		}),
	}),
);

const insertSchema = createInsertSchema(amostras, {
	cpf: t.Nullable(t.String({ pattern: CPF_REGEX })),
	cnpj: t.Nullable(t.String({ pattern: CNPJ_REGEX })),
	cep: t.Nullable(t.String({ pattern: CEP_REGEX })),
	telefone: t.Nullable(t.String({ pattern: TELEFONE_REGEX })),
});
const selectSchema = createSelectSchema(amostras);
const extractedInsertSchema = createInsertSchema(amostras, {
	cpf: t.Nullable(t.String()),
	cnpj: t.Nullable(t.String()),
	cep: t.Nullable(t.String()),
	telefone: t.Nullable(t.String()),
});

const percentuais = t.Array(t.Number());
const incidencias20 = t.Array(t.Number(), {
	minItems: 20,
	maxItems: 20,
});

const percentuaisInsert = t.Object({
	incidencias: t.Optional(
		t.Union([incidencias20, t.Null()], {
			error: "incidencias deve conter exatamente 20 valores",
		}),
	),
	acumuladoProposto: t.Optional(t.Nullable(percentuais)),
});

export const AmostrasModel = {
	select: t.Composite([
		selectSchema,
		t.Object({ incidencias: percentuais, acumuladoProposto: percentuais }),
	]),
	insert: t.Composite([
		t.Partial(t.Omit(insertSchema, ["avaliadorId", "createdAt", "updatedAt"])),
		t.Pick(insertSchema, ["avaliadorId"]),
		percentuaisInsert,
	]),
	update: t.Composite(
		[
			t.Partial(t.Omit(insertSchema, ["createdAt", "updatedAt"])),
			percentuaisInsert,
		],
		{
			minProperties: 1,
			error: "Informe ao menos um campo para atualizar.",
		},
	),
	listQuery: t.Object({
		cursor: t.Optional(t.Integer({ minimum: 1 })),
		limit: t.Integer({ minimum: 1, maximum: 100, default: 20 }),
		municipio: t.Optional(t.String()),
	}),
	planilhaQuery: t.Object({
		tipo: t.Optional(t.Union([t.Literal("terreno"), t.Literal("imovel")])),
	}),
	pdf: t.Object({
		pdf: t.File({
			maxSize: 10 * 1024 * 1024,
			error: "PDF deve ter no máximo 10MB",
		}),
	}),
	extracted: t.Composite([
		t.Required(
			t.Omit(extractedInsertSchema, ["avaliadorId", "createdAt", "updatedAt"]),
		),
		t.Object({
			incidencias: t.Nullable(incidencias20),
			acumuladoProposto: t.Nullable(percentuais),
			camposNaoEncontrados: t.Array(t.String()),
		}),
	]),
	statsQuery: t.Object({
		municipio: t.Optional(t.String()),
	}),
	statsResponse: t.Object(
		{
			total: t.Integer(),
			min: t.Nullable(t.Number()),
			max: t.Nullable(t.Number()),
			mean: t.Nullable(t.Number()),
			median: t.Nullable(t.Number()),
			q1: t.Nullable(t.Number()),
			q3: t.Nullable(t.Number()),
			iqr: t.Nullable(t.Number()),
			stdDev: t.Nullable(t.Number()),
			lowerFence: t.Nullable(t.Number()),
			upperFence: t.Nullable(t.Number()),
			outlierIds: t.Array(t.Integer()),
		},
		{
			description:
				"Valores monetarios em reais (ex.: 2450.51), na mesma unidade de valorUnitario nas demais rotas. Outliers seguem a regra de Tukey: fora de Q1 - 1.5*IQR ou Q3 + 1.5*IQR.",
		},
	),
} as const;

export type SelectAmostra = typeof amostras.$inferSelect;
export type AmostrasModel = {
	[K in keyof typeof AmostrasModel]: (typeof AmostrasModel)[K]["static"];
};
