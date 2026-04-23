import { describe, expect, test } from "bun:test";
import { formatCep, isValidCep } from "./cep";

describe("Validação de CEP", () => {
	test("deve retornar true para um CEP válido", () => {
		expect(isValidCep("12345-678")).toBe(true);
		expect(isValidCep("12345678")).toBe(true);
	});

	test("deve retornar false para um CEP com tamanho incorreto", () => {
		expect(isValidCep("1234567")).toBe(false);
		expect(isValidCep("123456789")).toBe(false);
	});
});

describe("Formatação de CEP", () => {
	test("deve formatar corretamente um CEP de 8 dígitos", () => {
		expect(formatCep("12345678")).toBe("12345-678");
	});

	test("deve manter a formatação se já estiver formatado", () => {
		expect(formatCep("12345-678")).toBe("12345-678");
		expect(formatCep("12345x678")).toBe("12345-678");
	});
});
