import { randomUUIDv7 } from "bun";
import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const verification = pgTable(
	"verification",
	{
		id: uuid("id")
			.primaryKey()
			.$defaultFn(() => randomUUIDv7()),
		identifier: text("identifier").notNull(),
		value: text("value").notNull(),
		expiresAt: timestamp("expires_at").notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
	},
	(table) => [index("verification_identifier_idx").on(table.identifier)],
);
