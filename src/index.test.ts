import { describe, expect, test } from "bun:test";
import { app } from "@/index";

describe("app", () => {
	test("GET /health returns ok", async () => {
		const response = await app.handle(new Request("http://localhost/health"));

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ status: "ok" });
	});

	test("GET /amostras/:id rejects non-numeric id with 400", async () => {
		const response = await app.handle(
			new Request("http://localhost/amostras/abc"),
		);

		expect(response.status).toBe(400);
		expect(await response.json()).toHaveProperty("message");
	});

	test("unknown route returns 404 json", async () => {
		const response = await app.handle(new Request("http://localhost/nope"));

		expect(response.status).toBe(404);
		expect(await response.json()).toEqual({ message: "Rota não encontrada" });
	});

	test("POST /amostras/similares without coordenadas returns 400", async () => {
		const response = await app.handle(
			new Request("http://localhost/amostras/similares", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({}),
			}),
		);

		expect(response.status).toBe(400);
		expect(await response.json()).toHaveProperty("message");
	});
});
