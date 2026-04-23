import { char, integer, pgTable, text, varchar } from "drizzle-orm/pg-core";
import {
	createInsertSchema,
	createSelectSchema,
	createUpdateSchema,
} from "drizzle-zod";

export const profissionais = pgTable("profissionais", {
	id: integer().primaryKey().generatedAlwaysAsIdentity(),
	nome: text().notNull(),
	nomeFantasia: text().notNull(),
	cpf: char({ length: 11 }).unique().notNull(),
	cnpj: char({ length: 14 }).unique().notNull(),
	registroCrea: varchar({ length: 25 }).notNull(),
});

export const profissionaisSelectSchema = createSelectSchema(profissionais);
export const profissionaisInsertSchema = createInsertSchema(profissionais);
export const profissionaisUpdateSchema = createUpdateSchema(profissionais);
