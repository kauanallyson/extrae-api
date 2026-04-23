import { describe, expect, test } from "bun:test";
import { formatCpf, isValidCpf } from "./cpf";

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

describe("Formatação de CPF", () => {
	test("deve formatar corretamente um CPF de 11 dígitos", () => {
		expect(formatCpf("12345678909")).toBe("123.456.789-09");
	});

	test("deve manter a formatação se já estiver formatado e limpar caracteres extras", () => {
		expect(formatCpf("123.456.789-09")).toBe("123.456.789-09");
		expect(formatCpf("123!456@789#09")).toBe("123.456.789-09");
	});
});
