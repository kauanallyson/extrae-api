import { integer, pgTable, text, varchar } from "drizzle-orm/pg-core";
import {
	createInsertSchema,
	createSelectSchema,
	createUpdateSchema,
} from "drizzle-typebox";

export const avaliadores = pgTable("avaliadores", {
	id: integer().primaryKey().generatedAlwaysAsIdentity(),
	nome: text().notNull(),
	nomeFantasia: text().notNull(),
	cpf: varchar({ length: 14 }).unique().notNull(),
	cnpj: varchar({ length: 18 }).unique().notNull(),
	registroCrea: varchar({ length: 25 }).notNull(),
});

export const avaliadoresSelectSchema = createSelectSchema(avaliadores);
export const avaliadoresInsertSchema = createInsertSchema(avaliadores);
export const avaliadoresUpdateSchema = createUpdateSchema(avaliadores);
