import { integer, pgTable, text, varchar } from "drizzle-orm/pg-core";
import {
	createInsertSchema,
	createSelectSchema,
	createUpdateSchema,
} from "drizzle-typebox";
import { t } from "elysia";

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
	cpf: t.String({ minLength: 11, maxLength: 14, pattern: "^[0-9.-]*$" }),
	cnpj: t.String({ minLength: 14, maxLength: 18, pattern: "^[0-9./-]*$" }),
});

export const avaliadoresUpdateSchema = createUpdateSchema(avaliadores, {
	cpf: t.Optional(
		t.String({ minLength: 11, maxLength: 14, pattern: "^[0-9.-]*$" }),
	),
	cnpj: t.Optional(
		t.String({ minLength: 14, maxLength: 18, pattern: "^[0-9./-]*$" }),
	),
});
