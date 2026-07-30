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

	test("writing an amostra is reflected in the stats", async () => {
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

	async function criarAvaliador(
		headers: Record<string, string>,
	): Promise<number> {
		const response = await app.handle(
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
		expect(response.status).toBe(201);
		return (await response.json()).id;
	}

	test("grafias diferentes do mesmo municipio viram um unico registro", async () => {
		const headers = {
			"content-type": "application/json",
			...(await authHeaders()),
		};
		const avaliadorId = await criarAvaliador(headers);

		// sufixo unico isola este municipio de qualquer outro dado do banco
		const nome = `Belém ${crypto.randomUUID()}`;
		const variantes = [nome, `  ${nome.toUpperCase()} `];

		const criadas = [];
		for (const municipio of variantes) {
			const response = await app.handle(
				new Request("http://localhost/amostras", {
					method: "POST",
					headers,
					body: JSON.stringify({
						avaliadorId,
						municipio,
						uf: "PA",
						valorUnitario: 1000,
					}),
				}),
			);
			expect(response.status).toBe(201);
			criadas.push(await response.json());
		}

		// contrato plano preservado, e vale a primeira grafia registrada
		for (const amostra of criadas) {
			expect(amostra.municipio).toBe(nome);
			expect(amostra.uf).toBe("PA");
		}

		const listaResponse = await app.handle(
			new Request("http://localhost/municipios", {
				headers: await authHeaders(),
			}),
		);
		expect(listaResponse.status).toBe(200);
		const lista = await listaResponse.json();
		const registros = lista.filter(
			(item: { nome: string }) =>
				item.nome.toLowerCase() === nome.toLowerCase(),
		);
		expect(registros).toHaveLength(1);
		expect(registros[0]).toMatchObject({
			nome,
			uf: "PA",
			totalAmostras: 2,
		});

		// qualquer grafia encontra as duas amostras nos filtros
		for (const grafia of [nome, nome.toUpperCase(), nome.toLowerCase()]) {
			const query = encodeURIComponent(grafia);

			const listagem = await app.handle(
				new Request(`http://localhost/amostras?municipio=${query}`, {
					headers: await authHeaders(),
				}),
			);
			expect(listagem.status).toBe(200);
			expect((await listagem.json()).data).toHaveLength(2);

			const stats = await app.handle(
				new Request(`http://localhost/amostras/stats?municipio=${query}`, {
					headers: await authHeaders(),
				}),
			);
			expect(stats.status).toBe(200);
			expect(await stats.json()).toMatchObject({ total: 2, mean: 1000 });
		}

		for (const amostra of criadas) {
			await app.handle(
				new Request(`http://localhost/amostras/${amostra.id}`, {
					method: "DELETE",
					headers: await authHeaders(),
				}),
			);
		}
		await app.handle(
			new Request(`http://localhost/avaliadores/${avaliadorId}`, {
				method: "DELETE",
				headers: await authHeaders(),
			}),
		);
	});

	test("PUT em /amostras preserva o municipio ao alterar so a uf", async () => {
		const headers = {
			"content-type": "application/json",
			...(await authHeaders()),
		};
		const avaliadorId = await criarAvaliador(headers);
		const municipio = `Cidade ${crypto.randomUUID()}`;

		const createResponse = await app.handle(
			new Request("http://localhost/amostras", {
				method: "POST",
				headers,
				body: JSON.stringify({ avaliadorId, municipio, uf: "PA" }),
			}),
		);
		expect(createResponse.status).toBe(201);
		const { id } = await createResponse.json();

		const updateResponse = await app.handle(
			new Request(`http://localhost/amostras/${id}`, {
				method: "PUT",
				headers,
				body: JSON.stringify({ uf: "PB" }),
			}),
		);
		expect(updateResponse.status).toBe(200);
		expect(await updateResponse.json()).toMatchObject({ municipio, uf: "PB" });

		await app.handle(
			new Request(`http://localhost/amostras/${id}`, {
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

	test("filtro por municipio inexistente devolve resultado vazio", async () => {
		const query = encodeURIComponent(`Inexistente ${crypto.randomUUID()}`);

		const listagem = await app.handle(
			new Request(`http://localhost/amostras?municipio=${query}`, {
				headers: await authHeaders(),
			}),
		);
		expect(listagem.status).toBe(200);
		expect(await listagem.json()).toEqual({ data: [], nextCursor: null });

		const stats = await app.handle(
			new Request(`http://localhost/amostras/stats?municipio=${query}`, {
				headers: await authHeaders(),
			}),
		);
		expect(stats.status).toBe(200);
		expect(await stats.json()).toMatchObject({ total: 0, mean: null });
	});

	test("GET /municipios sem token retorna 401", async () => {
		const response = await app.handle(
			new Request("http://localhost/municipios"),
		);

		expect(response.status).toBe(401);
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
