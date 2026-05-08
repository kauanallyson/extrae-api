import { integer, pgTable, text, varchar } from "drizzle-orm/pg-core";
import {
	createInsertSchema,
	createSelectSchema,
	createUpdateSchema,
} from "drizzle-zod";
import { z } from "zod";

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
	cpf: z.string().regex(/^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/),
	cnpj: z.string().regex(/^\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}$/),
});

export const avaliadoresUpdateSchema = createUpdateSchema(avaliadores, {
	cpf: z
		.string()
		.regex(/^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/)
		.optional(),
	cnpj: z
		.string()
		.regex(/^\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}$/)
		.optional(),
});
