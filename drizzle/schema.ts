import { pgTable, unique, integer, varchar, char } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const profissionais = pgTable("profissionais", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "profissionais_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	nome: varchar({ length: 512 }).notNull(),
	nomeFantasia: varchar({ length: 512 }).notNull(),
	cpf: char({ length: 11 }).notNull(),
	cnpj: char({ length: 14 }).notNull(),
	registroCrea: varchar({ length: 25 }).notNull(),
}, (table) => [
	unique("profissionais_cpf_unique").on(table.cpf),
	unique("profissionais_cnpj_unique").on(table.cnpj),
]);
