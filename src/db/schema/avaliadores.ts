import { integer, pgTable, text, varchar } from "drizzle-orm/pg-core";
import {
	createInsertSchema,
	createSelectSchema,
	createUpdateSchema,
} from "drizzle-zod";
import { cnpjSchema, cpfSchema } from "@/lib/schemas";

export const avaliadores = pgTable("avaliadores", {
	id: integer().primaryKey().generatedAlwaysAsIdentity(),
	nome: text().notNull(),
	nomeFantasia: text().notNull(),
	cpf: varchar({ length: 14 }).unique().notNull(),
	cnpj: varchar({ length: 18 }).unique().notNull(),
	registroCrea: varchar({ length: 25 }).notNull(),
});

export const avaliadoresSelectSchema = createSelectSchema(avaliadores);

export const avaliadoresInsertSchema = createInsertSchema(avaliadores, {
	cpf: cpfSchema,
	cnpj: cnpjSchema,
});

export const avaliadoresUpdateSchema = createUpdateSchema(avaliadores, {
	cpf: cpfSchema.optional(),
	cnpj: cnpjSchema.optional(),
});
