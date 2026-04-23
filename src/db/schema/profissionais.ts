import { integer, pgTable, text, varchar } from "drizzle-orm/pg-core";
import {
	createInsertSchema,
	createSelectSchema,
	createUpdateSchema,
} from "drizzle-zod";

export const profissionais = pgTable("profissionais", {
	id: integer().primaryKey().generatedAlwaysAsIdentity(),
	nome: text().notNull(),
	nomeFantasia: text().notNull(),
	cpf: varchar({ length: 14 }).unique().notNull(),
	cnpj: varchar({ length: 18 }).unique().notNull(),
	registroCrea: varchar({ length: 25 }).notNull(),
});

export const profissionaisSelectSchema = createSelectSchema(profissionais);
export const profissionaisInsertSchema = createInsertSchema(profissionais);
export const profissionaisUpdateSchema = createUpdateSchema(profissionais);
