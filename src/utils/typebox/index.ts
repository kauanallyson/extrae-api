import { t } from "elysia";

export const idParamsSchema = t.Object({
	id: t.Integer(),
});

/**
 * @lastModified 2025-02-04
 * @see https://elysiajs.com/recipe/drizzle.html#utility
 */

import { Kind, type TObject } from "@sinclair/typebox";
import type { Table } from "drizzle-orm";
import {
	type BuildSchema,
	createInsertSchema,
	createSelectSchema,
} from "drizzle-typebox";

type Spread<
	T extends TObject | Table,
	Mode extends "select" | "insert" | undefined,
> =
	T extends TObject<infer Fields>
		? {
				[K in keyof Fields]: Fields[K];
			}
		: T extends Table
			? Mode extends "select"
				? BuildSchema<"select", T["_"]["columns"], undefined>["properties"]
				: Mode extends "insert"
					? BuildSchema<"insert", T["_"]["columns"], undefined>["properties"]
					: // biome-ignore lint/complexity/noBannedTypes: verbatim from the Elysia drizzle integration guide
						{}
			: // biome-ignore lint/complexity/noBannedTypes: verbatim from the Elysia drizzle integration guide
				{};

/**
 * Spread a Drizzle schema into a plain object
 */
export const spread = <
	T extends TObject | Table,
	Mode extends "select" | "insert" | undefined,
>(
	schema: T,
	mode?: Mode,
): Spread<T, Mode> => {
	const newSchema: Record<string, unknown> = {};
	let table: TObject;

	switch (mode) {
		case "insert":
		case "select":
			if (Kind in schema) {
				table = schema;
				break;
			}

			table =
				mode === "insert"
					? createInsertSchema(schema)
					: createSelectSchema(schema);

			break;

		default:
			if (!(Kind in schema)) throw new Error("Expect a schema");
			table = schema;
	}

	for (const key of Object.keys(table.properties))
		newSchema[key] = table.properties[key];

	// biome-ignore lint/suspicious/noExplicitAny: type-level mapping mirrors the runtime spread
	return newSchema as any;
};

/**
 * Spread a Drizzle Table into a plain object
 *
 * If `mode` is 'insert', the schema will be refined for insert
 * If `mode` is 'select', the schema will be refined for select
 * If `mode` is undefined, the schema will be spread as is, models will need to be refined manually
 */
export const spreads = <
	T extends Record<string, TObject | Table>,
	Mode extends "select" | "insert" | undefined,
>(
	models: T,
	mode?: Mode,
): {
	[K in keyof T]: Spread<T[K], Mode>;
} => {
	const newSchema: Record<string, unknown> = {};
	const keys = Object.keys(models);

	for (const key of keys) newSchema[key] = spread(models[key], mode);

	// biome-ignore lint/suspicious/noExplicitAny: type-level mapping mirrors the runtime spread
	return newSchema as any;
};
