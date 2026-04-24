import {
	char,
	integer,
	pgTable,
	real,
	text,
	timestamp,
	varchar,
} from "drizzle-orm/pg-core";
import {
	createInsertSchema,
	createSelectSchema,
	createUpdateSchema,
} from "drizzle-typebox";
import { t } from "elysia";
import { avaliadores } from "./avaliadores";

export const amostras = pgTable("amostras", {
	id: integer().primaryKey().generatedAlwaysAsIdentity(),
	textoExtraido: text(),
	avaliadorId: integer()
		.references(() => avaliadores.id)
		.notNull(),
	proponente: text(),
	cpf: varchar({ length: 14 }),
	cnpj: varchar({ length: 18 }),
	ddd: varchar({ length: 3 }),
	telefone: varchar({ length: 20 }),
	enderecoLiteral: text(),
	coordenadaS: text(),
	coordenadaW: text(),
	complemento: text(),
	bairro: text(),
	cep: varchar({ length: 15 }),
	municipio: text(),
	uf: char({ length: 2 }),
	empresaResponsavel: text(),
	valorTerreno: real(),
	matricula: text(),
	oficio: text(),
	comarca: text(),
	ufMatricula: char({ length: 2 }),
	valorImovel: real(),
	incidencias: real().array(),
	numeroEtapas: integer(),
	acumuladoProposto: real().array(),
	valorUnitario: real(),
	testada: real(),
	idadeEstimada: text(),
	areaTerreno: real(),
	areaConstruida: real(),
	quartos: integer(),
	banheiros: integer(),
	suites: integer(),
	vagas: integer(),
	padraoAcabamento: text(),
	estadoConservacao: text(),
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

export const amostrasSelectSchema = createSelectSchema(amostras);

export const amostrasInsertSchema = createInsertSchema(amostras, {
	dataReferencia: t.String(),
	createdAt: t.Optional(t.Never()),
	updatedAt: t.Optional(t.Never()),
});

export const amostrasUpdateSchema = createUpdateSchema(amostras, {
	createdAt: t.Optional(t.Never()),
	updatedAt: t.Optional(t.Never()),
});
