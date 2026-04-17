import { char, integer, pgTable, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema, createUpdateSchema } from "drizzle-zod";

export const profissionais = pgTable("profissionais", {
	id: integer().primaryKey().generatedAlwaysAsIdentity(),
	nome: varchar({ length: 512 }).notNull(),
	nomeFantasia: varchar({ length: 512 }).notNull(),
	cpf: char({ length: 11 }).unique().notNull(),
	cnpj: char({ length: 14 }).unique().notNull(),
	registroCrea: varchar({ length: 25 }).notNull(),
});

export const insertProfissionalSchema = createInsertSchema(profissionais, {
	nome: (schema) => schema.min(3).max(512),
	cnpj: (schema) => schema.length(14, "CNPJ must be exactly 14 digits"),
	cpf: (schema) => schema.length(11, "CPF must be exactly 11 digits"),
	registroCrea: (schema) => schema.min(3),
});

export const updateProfissionalSchema = createUpdateSchema(profissionais, {
	nome: (schema) => schema.min(3).max(512),
	cnpj: (schema) => schema.length(14, "CNPJ must be exactly 14 digits"),
	cpf: (schema) => schema.length(11, "CPF must be exactly 11 digits"),
	registroCrea: (schema) => schema.min(3),
});
