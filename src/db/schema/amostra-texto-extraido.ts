import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-typebox";
import { amostras } from "./amostra";

export const amostrasTextoExtraido = pgTable("amostras_texto_extraido", {
	id: integer().primaryKey().generatedAlwaysAsIdentity(),
	amostraId: integer()
		.references(() => amostras.id, { onDelete: "cascade" })
		.notNull()
		.unique(),
	textoExtraido: text().notNull(),
	createdAt: timestamp().defaultNow().notNull(),
	updatedAt: timestamp()
		.defaultNow()
		.$onUpdateFn(() => new Date())
		.notNull(),
});

export const amostrasTextoExtraidoSelectSchema = createSelectSchema(
	amostrasTextoExtraido,
);

export const amostrasTextoExtraidoInsertSchema = createInsertSchema(
	amostrasTextoExtraido,
);
