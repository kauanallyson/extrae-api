import { integer, pgTable, text, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import type { z } from "zod";
import { cnpjSchema, cpfSchema } from "@/utils/schemas";

export const avaliadores = pgTable("avaliadores", {
	id: integer().primaryKey().generatedAlwaysAsIdentity(),
	nome: text().notNull(),
	nomeFantasia: text().notNull(),
	cpf: varchar({ length: 14 }).unique().notNull(),
	cnpj: varchar({ length: 18 }).unique().notNull(),
	registroCrea: varchar({ length: 15 }).notNull(),
});

export const avaliadorSelectSchema = createSelectSchema(avaliadores);
export const avaliadorInsertSchema = createInsertSchema(avaliadores, {
	cpf: cpfSchema,
	cnpj: cnpjSchema,
});
export const avaliadorUpdateSchema = avaliadorInsertSchema
	.partial()
	.refine((data) => Object.keys(data).length > 0, {
		message: "Informe ao menos um campo para atualizar.",
	});

export const AvaliadoresModel = {
	insert: avaliadorInsertSchema,
	update: avaliadorUpdateSchema,
} as const;

export type AvaliadorSelect = z.infer<typeof avaliadorSelectSchema>;
export type AvaliadorInsert = z.infer<typeof avaliadorInsertSchema>;
export type AvaliadorUpdate = z.infer<typeof avaliadorUpdateSchema>;
export type AvaliadoresModel = {
	[K in keyof typeof AvaliadoresModel]: z.infer<(typeof AvaliadoresModel)[K]>;
};
