import { describe, expect, test } from "bun:test";
import { app } from "@/index";

describe("app", () => {
	async function authHeader(): Promise<Record<string, string>> {
		const email = `test-${crypto.randomUUID()}@example.com`;
		await app.handle(
			new Request("http://localhost/auth/register", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ nome: "Teste", email, senha: "senha1234" }),
			}),
		);
		const loginResponse = await app.handle(
			new Request("http://localhost/auth/login", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ email, senha: "senha1234" }),
			}),
		);
		const { token } = await loginResponse.json();
		return { authorization: `Bearer ${token}` };
	}

	test("GET /health returns ok", async () => {
		const response = await app.handle(new Request("http://localhost/health"));

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ status: "ok" });
	});

	test("GET /amostras/:id rejects non-numeric id with 400", async () => {
		const response = await app.handle(
			new Request("http://localhost/amostras/abc", {
				headers: await authHeader(),
			}),
		);

		expect(response.status).toBe(400);
		expect(await response.json()).toHaveProperty("message");
	});

	test("GET /amostras rejects invalid pagination limit with 400", async () => {
		const response = await app.handle(
			new Request("http://localhost/amostras?limit=0", {
				headers: await authHeader(),
			}),
		);

		expect(response.status).toBe(400);
		expect(await response.json()).toHaveProperty("message");
	});

	test("GET /amostras without a token returns 401", async () => {
		const response = await app.handle(
			new Request("http://localhost/amostras"),
		);

		expect(response.status).toBe(401);
	});

	test("GET /amostras with a valid token succeeds", async () => {
		const response = await app.handle(
			new Request("http://localhost/amostras", {
				headers: await authHeader(),
			}),
		);

		expect(response.status).toBe(200);
	});

	test("unknown route returns 404 json", async () => {
		const response = await app.handle(new Request("http://localhost/nope"));

		expect(response.status).toBe(404);
		expect(await response.json()).toEqual({ message: "Rota não encontrada" });
	});

	test("PUT /amostras/:id with empty body returns custom 400 message", async () => {
		const response = await app.handle(
			new Request("http://localhost/amostras/1", {
				method: "PUT",
				headers: { "content-type": "application/json", ...(await authHeader()) },
				body: JSON.stringify({}),
			}),
		);

		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({
			message: "Informe ao menos um campo para atualizar.",
		});
	});

	test("POST /auth/register creates a user and returns a token", async () => {
		const response = await app.handle(
			new Request("http://localhost/auth/register", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					nome: "Teste",
					email: `test-${crypto.randomUUID()}@example.com`,
					senha: "senha1234",
				}),
			}),
		);

		expect(response.status).toBe(201);
		expect(await response.json()).toHaveProperty("token");
	});

	test("POST /auth/register with duplicate email returns 409", async () => {
		const email = `test-${crypto.randomUUID()}@example.com`;
		const register = () =>
			app.handle(
				new Request("http://localhost/auth/register", {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({ nome: "Teste", email, senha: "senha1234" }),
				}),
			);

		await register();
		const response = await register();

		expect(response.status).toBe(409);
		expect(await response.json()).toEqual({
			message: "Já existe um usuário com este e-mail.",
		});
	});

	test("POST /auth/login with wrong password returns 401", async () => {
		const email = `test-${crypto.randomUUID()}@example.com`;
		await app.handle(
			new Request("http://localhost/auth/register", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ nome: "Teste", email, senha: "senha1234" }),
			}),
		);

		const response = await app.handle(
			new Request("http://localhost/auth/login", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ email, senha: "senhaerrada" }),
			}),
		);

		expect(response.status).toBe(401);
		expect(await response.json()).toEqual({ message: "Credenciais inválidas." });
	});

	test("GET /auth/me without a token returns 401", async () => {
		const response = await app.handle(
			new Request("http://localhost/auth/me"),
		);

		expect(response.status).toBe(401);
	});

	test("POST /auth/login then GET /auth/me returns the user", async () => {
		const email = `test-${crypto.randomUUID()}@example.com`;
		await app.handle(
			new Request("http://localhost/auth/register", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ nome: "Teste", email, senha: "senha1234" }),
			}),
		);
		const loginResponse = await app.handle(
			new Request("http://localhost/auth/login", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ email, senha: "senha1234" }),
			}),
		);
		const { token } = await loginResponse.json();

		const meResponse = await app.handle(
			new Request("http://localhost/auth/me", {
				headers: { authorization: `Bearer ${token}` },
			}),
		);

		expect(meResponse.status).toBe(200);
		const body = await meResponse.json();
		expect(body).toMatchObject({ email, nome: "Teste" });
	});
});
