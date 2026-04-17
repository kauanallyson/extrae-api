import { describe, expect, test } from "bun:test";
import { isValidCnpj, isValidCpf } from "./cpf-cnpj";

describe("Validação de CPF", () => {
	test("deve retornar true para um CPF válido", () => {
		// CPF válido com pontuação
		expect(isValidCpf("123.456.789-09")).toBe(true);
		// CPF válido sem pontuação
		expect(isValidCpf("12345678909")).toBe(true);
	});

	test("deve retornar false para um CPF inválido", () => {
		// CPF com dígitos verificadores incorretos
		expect(isValidCpf("12345678901")).toBe(false);
		// CPF com todos os dígitos iguais (inválido pela regra)
		expect(isValidCpf("11111111111")).toBe(false);
		// Muito curto
		expect(isValidCpf("123")).toBe(false);
		// Muito longo
		expect(isValidCpf("123456789012")).toBe(false);
	});

	test("deve ignorar caracteres não numéricos", () => {
		expect(isValidCpf("123!456@789#09")).toBe(true);
	});
});

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
