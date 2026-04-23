import { describe, expect, test } from "bun:test";
import { formatCnpj, isValidCnpj } from "./cnpj";

describe("Validação de CNPJ", () => {
	test("deve retornar true para um CNPJ válido", () => {
		// CNPJ válido com pontuação
		expect(isValidCnpj("06.990.590/0001-23")).toBe(true);
		// CNPJ válido sem pontuação
		expect(isValidCnpj("06990590000123")).toBe(true);
	});

	test("deve retornar false para um CNPJ inválido", () => {
		// CNPJ com dígitos verificadores incorretos
		expect(isValidCnpj("06990590000124")).toBe(false);
		// CNPJ com todos os dígitos iguais (inválido pela regra)
		expect(isValidCnpj("11111111111111")).toBe(false);
		// Muito curto
		expect(isValidCnpj("123")).toBe(false);
		// Muito longo
		expect(isValidCnpj("0699059000012345")).toBe(false);
	});

	test("deve ignorar caracteres não numéricos", () => {
		expect(isValidCnpj("06.990x590/0001-23")).toBe(true);
	});
});

describe("Formatação de CNPJ", () => {
	test("deve formatar corretamente um CNPJ de 14 dígitos", () => {
		expect(formatCnpj("06990590000123")).toBe("06.990.590/0001-23");
	});

	test("deve manter a formatação se já estiver formatado e limpar caracteres extras", () => {
		expect(formatCnpj("06.990.590/0001-23")).toBe("06.990.590/0001-23");
		expect(formatCnpj("06.990x590/0001-23")).toBe("06.990.590/0001-23");
	});
});
