import { describe, expect, test } from "bun:test";
import { app } from "@/index";

describe("app", () => {
	// no seeded test user exists, so register+login a fresh one on every call
	async function authHeaders(): Promise<Record<string, string>> {
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

	function randomDigits(length: number): string {
		return Array.from({ length }, () => Math.floor(Math.random() * 10)).join(
			"",
		);
	}

	test("GET /health returns ok", async () => {
		const response = await app.handle(new Request("http://localhost/health"));

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ status: "ok" });
	});

	test("GET /amostras/:id rejects non-numeric id with 400", async () => {
		const response = await app.handle(
			new Request("http://localhost/amostras/abc", {
				headers: await authHeaders(),
			}),
		);

		expect(response.status).toBe(400);
		expect(await response.json()).toHaveProperty("message");
	});

	test("GET /amostras rejects invalid pagination limit with 400", async () => {
		const response = await app.handle(
			new Request("http://localhost/amostras?limit=0", {
				headers: await authHeaders(),
			}),
		);

		expect(response.status).toBe(400);
		expect(await response.json()).toHaveProperty("message");
	});

	test("GET /amostras without a token returns 401", async () => {
		const response = await app.handle(new Request("http://localhost/amostras"));

		expect(response.status).toBe(401);
	});

	test("GET /amostras with a valid token succeeds", async () => {
		const response = await app.handle(
			new Request("http://localhost/amostras", {
				headers: await authHeaders(),
			}),
		);

		expect(response.status).toBe(200);
	});

	test("GET /amostras with a malformed token returns 401", async () => {
		const response = await app.handle(
			new Request("http://localhost/amostras", {
				headers: { authorization: "Bearer not-a-real-token" },
			}),
		);

		expect(response.status).toBe(401);
	});

	test("GET /avaliadores without a token returns 401", async () => {
		const response = await app.handle(
			new Request("http://localhost/avaliadores"),
		);

		expect(response.status).toBe(401);
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
				headers: {
					"content-type": "application/json",
					...(await authHeaders()),
				},
				body: JSON.stringify({}),
			}),
		);

		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({
			message: "Informe ao menos um campo para atualizar.",
		});
	});

	test("amostra round-trip preserves decimal values", async () => {
		const headers = {
			"content-type": "application/json",
			...(await authHeaders()),
		};

		const avaliadorResponse = await app.handle(
			new Request("http://localhost/avaliadores", {
				method: "POST",
				headers,
				body: JSON.stringify({
					nome: "Avaliador Teste",
					nomeFantasia: "Teste",
					cpf: `${randomDigits(3)}.${randomDigits(3)}.${randomDigits(3)}-${randomDigits(2)}`,
					cnpj: `${randomDigits(2)}.${randomDigits(3)}.${randomDigits(3)}/${randomDigits(4)}-${randomDigits(2)}`,
					registroCrea: randomDigits(10),
				}),
			}),
		);
		expect(avaliadorResponse.status).toBe(201);
		const { id: avaliadorId } = await avaliadorResponse.json();

		const incidencias = Array.from({ length: 20 }, (_, index) =>
			index === 0 ? 12.34 : 4.61,
		);
		const createResponse = await app.handle(
			new Request("http://localhost/amostras", {
				method: "POST",
				headers,
				body: JSON.stringify({
					avaliadorId,
					valorTerreno: 1234.56,
					valorImovel: 250000.99,
					valorUnitario: 2450.51,
					areaTerreno: 250.5,
					areaConstruida: 120.75,
					testada: 10.25,
					incidencias,
					acumuladoProposto: [0.5, 33.33, 100],
				}),
			}),
		);
		expect(createResponse.status).toBe(201);
		const created = await createResponse.json();

		const getResponse = await app.handle(
			new Request(`http://localhost/amostras/${created.id}`, {
				headers: await authHeaders(),
			}),
		);
		expect(getResponse.status).toBe(200);
		const fetched = await getResponse.json();

		expect(fetched).toMatchObject({
			valorTerreno: 1234.56,
			valorImovel: 250000.99,
			valorUnitario: 2450.51,
			areaTerreno: 250.5,
			areaConstruida: 120.75,
			testada: 10.25,
			incidencias,
			acumuladoProposto: [0.5, 33.33, 100],
		});

		await app.handle(
			new Request(`http://localhost/amostras/${created.id}`, {
				method: "DELETE",
				headers: await authHeaders(),
			}),
		);
		await app.handle(
			new Request(`http://localhost/avaliadores/${avaliadorId}`, {
				method: "DELETE",
				headers: await authHeaders(),
			}),
		);
	});

	test("GET /amostras/stats returns the same payload when served from cache", async () => {
		const headers = await authHeaders();
		const url = "http://localhost/amostras/stats";

		const first = await app.handle(new Request(url, { headers }));
		const second = await app.handle(new Request(url, { headers }));

		expect(first.status).toBe(200);
		expect(second.status).toBe(200);
		expect(await second.json()).toEqual(await first.json());
	});

	test("writing an amostra invalidates the cached stats", async () => {
		const headers = {
			"content-type": "application/json",
			...(await authHeaders()),
		};
		// municipio unico isola estas estatisticas de qualquer outro dado
		const municipio = `Cidade ${crypto.randomUUID()}`;
		const statsUrl = `http://localhost/amostras/stats?municipio=${encodeURIComponent(municipio)}`;

		const statsFor = async (): Promise<{
			total: number;
			mean: number | null;
		}> => {
			const response = await app.handle(
				new Request(statsUrl, { headers: await authHeaders() }),
			);
			expect(response.status).toBe(200);
			return await response.json();
		};

		// popula o cache com o estado vazio
		expect(await statsFor()).toMatchObject({ total: 0, mean: null });

		const avaliadorResponse = await app.handle(
			new Request("http://localhost/avaliadores", {
				method: "POST",
				headers,
				body: JSON.stringify({
					nome: "Avaliador Teste",
					nomeFantasia: "Teste",
					cpf: `${randomDigits(3)}.${randomDigits(3)}.${randomDigits(3)}-${randomDigits(2)}`,
					cnpj: `${randomDigits(2)}.${randomDigits(3)}.${randomDigits(3)}/${randomDigits(4)}-${randomDigits(2)}`,
					registroCrea: randomDigits(10),
				}),
			}),
		);
		expect(avaliadorResponse.status).toBe(201);
		const { id: avaliadorId } = await avaliadorResponse.json();

		const createResponse = await app.handle(
			new Request("http://localhost/amostras", {
				method: "POST",
				headers,
				body: JSON.stringify({ avaliadorId, municipio, valorUnitario: 1500 }),
			}),
		);
		expect(createResponse.status).toBe(201);
		const created = await createResponse.json();

		// so passa se o POST tiver invalidado a entrada anterior
		expect(await statsFor()).toMatchObject({ total: 1, mean: 1500 });

		const updateResponse = await app.handle(
			new Request(`http://localhost/amostras/${created.id}`, {
				method: "PUT",
				headers,
				body: JSON.stringify({ valorUnitario: 2500 }),
			}),
		);
		expect(updateResponse.status).toBe(200);
		expect(await statsFor()).toMatchObject({ total: 1, mean: 2500 });

		const deleteResponse = await app.handle(
			new Request(`http://localhost/amostras/${created.id}`, {
				method: "DELETE",
				headers: await authHeaders(),
			}),
		);
		expect(deleteResponse.status).toBe(200);
		expect(await statsFor()).toMatchObject({ total: 0, mean: null });

		await app.handle(
			new Request(`http://localhost/avaliadores/${avaliadorId}`, {
				method: "DELETE",
				headers: await authHeaders(),
			}),
		);
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
		expect(await response.json()).toEqual({
			message: "Credenciais inválidas.",
		});
	});

	test("GET /auth/me without a token returns 401", async () => {
		const response = await app.handle(new Request("http://localhost/auth/me"));

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
