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
} from "drizzle-zod";
import z from "zod";
import { profissionais } from "./profissionais";

export const laudos = pgTable("laudos", {
	id: integer().primaryKey().generatedAlwaysAsIdentity(),
	textoExtraido: text(),
	profissionalId: integer()
		.references(() => profissionais.id)
		.notNull(),
	proponente: text(),
	cpf: varchar({ length: 11 }),
	cnpj: varchar({ length: 14 }),
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

export const laudosSelectSchema = createSelectSchema(laudos);
export const laudosInsertSchema = createInsertSchema(laudos, {
	createdAt: z.string(),
	updatedAt: z.string(),
	dataReferencia: z.string(),
}).omit({
	profissionalId: true,
});
export const laudosUpdateSchema = createUpdateSchema(laudos);
