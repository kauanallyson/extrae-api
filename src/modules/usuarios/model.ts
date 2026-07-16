import { integer, pgTable, text, varchar } from "drizzle-orm/pg-core";

export const usuarios = pgTable("usuarios", {
	id: integer().primaryKey().generatedAlwaysAsIdentity(),
	nome: text().notNull(),
	email: varchar({ length: 255 }).unique().notNull(),
	senhaHash: text().notNull(),
});

export type UsuarioSelect = typeof usuarios.$inferSelect;
