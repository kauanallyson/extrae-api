import { integer, pgTable, text, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-typebox";
import { t } from "elysia";
import { CNPJ_REGEX, CPF_REGEX } from "@/utils/regex";

export const avaliadores = pgTable("avaliadores", {
	id: integer().primaryKey().generatedAlwaysAsIdentity(),
	nome: text().notNull(),
	nomeFantasia: text().notNull(),
	cpf: varchar({ length: 14 }).unique().notNull(),
	cnpj: varchar({ length: 18 }).unique().notNull(),
	registroCrea: varchar({ length: 15 }).notNull(),
});

const insertSchema = createInsertSchema(avaliadores, {
	cpf: t.String({ pattern: CPF_REGEX }),
	cnpj: t.String({ pattern: CNPJ_REGEX }),
});

export const AvaliadoresModel = {
	insert: insertSchema,
	update: t.Partial(insertSchema, {
		minProperties: 1,
		error: "Informe ao menos um campo para atualizar.",
	}),
} as const;

export type AvaliadorSelect = typeof avaliadores.$inferSelect;
export type AvaliadoresModel = {
	[K in keyof typeof AvaliadoresModel]: (typeof AvaliadoresModel)[K]["static"];
};
