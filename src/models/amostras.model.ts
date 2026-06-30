import {
	char,
	integer,
	numeric,
	pgTable,
	text,
	timestamp,
	varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import type { z } from "zod";
import { avaliadores } from "./avaliadores.model";

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
	valorTerreno: numeric(),
	matricula: text(),
	oficio: text(),
	comarca: text(),
	ufMatricula: char({ length: 2 }),
	valorImovel: numeric(),
	incidencias: numeric().array(),
	acumuladoProposto: numeric().array(),
	numeroEtapas: integer(),
	valorUnitario: numeric(),
	testada: numeric(),
	idadeEstimada: text(),
	areaTerreno: numeric(),
	areaConstruida: numeric(),
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

export const selectAmostraSchema = createSelectSchema(amostras);
export const insertAmostraSchema = createInsertSchema(amostras);
export const updateAmostraSchema = insertAmostraSchema.partial();

export type SelectAmostra = z.infer<typeof selectAmostraSchema>;
export type InsertAmostra = z.infer<typeof insertAmostraSchema>;
export type UpdateAmostra = z.infer<typeof updateAmostraSchema>;
