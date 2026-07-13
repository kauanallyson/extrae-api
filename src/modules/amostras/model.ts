import {
	bigint,
	char,
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

// Convenção monetária/decimal: inteiros com 2 casas implícitas.
// Dinheiro em centavos (R$ 1.234,56 -> 123456), áreas/testada em
// centésimos (250,50 m² -> 25050), percentuais em centésimos de %
// (12,34% -> 1234).
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
	valorTerreno: bigint({ mode: "number" }),
	matricula: text(),
	oficio: text(),
	comarca: text(),
	ufMatricula: char({ length: 2 }),
	valorImovel: bigint({ mode: "number" }),
	numeroEtapas: integer(),
	valorUnitario: bigint({ mode: "number" }),
	testada: integer(),
	idadeEstimada: text(),
	areaTerreno: integer(),
	areaConstruida: integer(),
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

export const incidencias = pgTable(
	"incidencias",
	{
		id: integer().primaryKey().generatedAlwaysAsIdentity(),
		amostraId: integer()
			.references(() => amostras.id, { onDelete: "cascade" })
			.notNull(),
		ordem: integer().notNull(),
		percentual: integer().notNull(),
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
		percentual: integer().notNull(),
	},
	(table) => [unique().on(table.amostraId, table.ordem)],
);

// Intermediate variables avoid "type instantiation is possibly infinite"
// when nesting drizzle-typebox output inside Elysia schemas.
const insertSchema = createInsertSchema(amostras, {
	cpf: t.Nullable(t.String({ pattern: CPF_REGEX })),
	cnpj: t.Nullable(t.String({ pattern: CNPJ_REGEX })),
	cep: t.Nullable(t.String({ pattern: CEP_REGEX })),
	telefone: t.Nullable(t.String({ pattern: TELEFONE_REGEX })),
});
const selectSchema = createSelectSchema(amostras);

const percentuais = t.Array(t.Integer());
const incidencias20 = t.Array(t.Integer(), {
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
	}),
	planilhaQuery: t.Object({ fields: t.Optional(t.String()) }),
	pdf: t.Object({
		pdf: t.File({
			maxSize: 10 * 1024 * 1024,
			error: "PDF deve ter no máximo 10MB",
		}),
	}),
	// Sem restrição de tamanho nos arrays: o structured output estrito da
	// OpenAI não aceita minItems/maxItems; o tamanho é garantido pelo prompt.
	extracted: t.Composite([
		t.Required(t.Omit(insertSchema, ["avaliadorId", "createdAt", "updatedAt"])),
		t.Object({
			incidencias: t.Nullable(percentuais),
			acumuladoProposto: t.Nullable(percentuais),
		}),
	]),
} as const;

export type SelectAmostra = typeof amostras.$inferSelect;
export type AmostrasModel = {
	[K in keyof typeof AmostrasModel]: (typeof AmostrasModel)[K]["static"];
};
