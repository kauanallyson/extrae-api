import {
	char,
	integer,
	numeric,
	pgTable,
	text,
	timestamp,
	varchar,
} from "drizzle-orm/pg-core";
import {
	createInsertSchema,
	createSelectSchema,
	createUpdateSchema,
} from "drizzle-zod";
import { z } from "zod";
import {
	cepSchema,
	cnpjSchema,
	cpfSchema,
	dddSchema,
	telefoneSchema,
} from "@/lib/schemas";
import { avaliadores } from "./avaliadores";

export const amostras = pgTable("amostras", {
	id: integer().primaryKey().generatedAlwaysAsIdentity(),
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
	valorTerreno: numeric({ precision: 14, scale: 2, mode: "number" }),
	matricula: text(),
	oficio: text(),
	comarca: text(),
	ufMatricula: char({ length: 2 }),
	valorImovel: numeric({ precision: 14, scale: 2, mode: "number" }),
	incidencias: numeric({ precision: 10, scale: 4, mode: "number" }).array(),
	numeroEtapas: integer(),
	acumuladoProposto: numeric({
		precision: 10,
		scale: 4,
		mode: "number",
	}).array(),
	valorUnitario: numeric({ precision: 14, scale: 2, mode: "number" }),
	testada: numeric({ precision: 14, scale: 2, mode: "number" }),
	idadeEstimada: text(),
	areaTerreno: numeric({ precision: 14, scale: 2, mode: "number" }),
	areaConstruida: numeric({ precision: 14, scale: 2, mode: "number" }),
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
	dataReferencia: z.string(),
	cpf: cpfSchema.optional(),
	cnpj: cnpjSchema.optional(),
	cep: cepSchema.optional(),
	ddd: dddSchema.optional(),
	telefone: telefoneSchema.optional(),
	createdAt: z.never().optional(),
	updatedAt: z.never().optional(),
});

export const amostrasUpdateSchema = createUpdateSchema(amostras, {
	cpf: cpfSchema.optional(),
	cnpj: cnpjSchema.optional(),
	cep: cepSchema.optional(),
	ddd: dddSchema.optional(),
	telefone: telefoneSchema.optional(),
	createdAt: z.never().optional(),
	updatedAt: z.never().optional(),
});
