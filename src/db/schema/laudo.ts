import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { dadosAmostra } from "./dadosAmostra";
import { dadosRae } from "./dadosRae";
import { profissionais } from "./profissionais";

export const laudos = pgTable("laudos", {
	id: integer().primaryKey().generatedAlwaysAsIdentity(),
	textoExtraido: text("texto_extraido"),
	profissionalId: integer("profissional_id")
		.references(() => profissionais.id)
		.notNull(),
	dadosAmostraId: integer("dados_amostra_id").references(() => dadosAmostra.id),
	dadosRaeId: integer("dados_rae_id").references(() => dadosRae.id),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at")
		.defaultNow()
		.$onUpdateFn(() => new Date())
		.notNull(),
});

export const insertLaudosSchema = createInsertSchema(laudos);
