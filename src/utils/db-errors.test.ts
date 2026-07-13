import { describe, expect, test } from "bun:test";
import { mapDatabaseError } from "./db-errors";

describe("mapDatabaseError", () => {
	const messages = {
		conflict: "conflict",
		foreignKey: "foreign-key",
		invalid: "invalid",
		default: "default",
	};

	test("maps unique violations to 409", () => {
		const response = mapDatabaseError({ code: "23505" }, messages);
		expect(response).toEqual({
			status: 409,
			body: { message: "conflict" },
		});
	});

	test("maps foreign key violations to 400", () => {
		const response = mapDatabaseError({ code: "23503" }, messages);
		expect(response).toEqual({
			status: 400,
			body: { message: "foreign-key" },
		});
	});

	test("maps invalid text representation to 400", () => {
		const response = mapDatabaseError({ code: "22P02" }, messages);
		expect(response).toEqual({
			status: 400,
			body: { message: "invalid" },
		});
	});

	test("falls back to 500 for unknown errors", () => {
		const response = mapDatabaseError({ code: "99999" }, messages);
		expect(response).toEqual({
			status: 500,
			body: { message: "default" },
		});
	});
});
