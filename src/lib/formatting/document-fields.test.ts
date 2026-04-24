import { describe, expect, test } from "bun:test";
import { normalizeDocumentFields } from "./document-fields";

describe("normalizeDocumentFields", () => {
	test("formata campos válidos", () => {
		const { data, invalidFields } = normalizeDocumentFields({
			cpf: "12345678909",
			cnpj: "06990590000123",
			cep: "12345678",
		});

		expect(data).toEqual({
			cpf: "123.456.789-09",
			cnpj: "06.990.590/0001-23",
			cep: "12345-678",
		});
		expect(invalidFields).toEqual([]);
	});

	test("reporta campos inválidos sem mascará-los", () => {
		const { data, invalidFields } = normalizeDocumentFields({
			cpf: "12345678901",
			cnpj: "06990590000124",
			cep: "1234567",
		});

		expect(data).toEqual({
			cpf: "12345678901",
			cnpj: "06990590000124",
			cep: "1234567",
		});
		expect(invalidFields).toEqual(["cpf", "cnpj", "cep"]);
	});
});
