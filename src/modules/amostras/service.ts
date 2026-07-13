import { Value } from "@sinclair/typebox/value";
import { desc, eq, getTableColumns } from "drizzle-orm";
import { status } from "elysia";
import ExcelJS from "exceljs";
import { db } from "@/config/db";
import { openai } from "@/config/openai";
import { avaliadores } from "@/modules/avaliadores/model";
import { Avaliadores } from "@/modules/avaliadores/service";
import {
	normalizeCep,
	sanitizeAsciiWord,
	stripNonDigits,
} from "@/utils/strings";
import { cellValue, writeEntries } from "@/utils/xlsx";
import type { SelectAmostra } from "./model";
import { type AmostrasModel, amostras, AmostrasModel as Model } from "./model";
import { SYSTEM_PROMPT } from "./prompt";

function notFound(id: number): never {
	throw status(404, { message: `Amostra ${id} nao encontrada.` });
}

async function ensureAvaliadorExiste(avaliadorId: number): Promise<void> {
	if (!(await Avaliadores.exists(avaliadorId))) {
		throw status(400, { message: "O avaliador informado nao existe." });
	}
}

function normalizeContato<
	T extends { cep?: string | null; telefone?: string | null },
>(data: T): T {
	return {
		...data,
		cep: normalizeCep(data.cep),
		telefone: stripNonDigits(data.telefone),
	} as T;
}

const PDF_MAGIC = Buffer.from([0x25, 0x50, 0x44, 0x46]);

const META_FIELDS = new Set(["id", "avaliadorId", "createdAt", "updatedAt"]);

const VIRTUAL_FIELDS = ["avaliador"] as const;

const FIELD_RESOLVERS: Record<
	string,
	(row: Record<string, unknown>) => unknown
> = {
	telefone: (row) => {
		const ddd = row.ddd ? String(row.ddd) : "";
		const telefone = row.telefone ? String(row.telefone) : "";
		if (!telefone) return "";
		return ddd ? `(${ddd}) ${telefone}` : telefone;
	},
};

const ALLOWED_FIELDS = [
	...Object.keys(Model.select.properties).filter(
		(field) => !META_FIELDS.has(field),
	),
	...VIRTUAL_FIELDS,
];
const ALLOWED_FIELDS_SET = new Set(ALLOWED_FIELDS);

const DEFAULT_FIELDS = [
	"avaliador",
	"proponente",
	"telefone",
	"endereco",
	"bairro",
	"municipio",
	"uf",
	"cep",
	"coordenadaS",
	"coordenadaW",
	"valorTerreno",
	"valorImovel",
	"valorUnitario",
	"areaTerreno",
	"areaConstruida",
	"testada",
	"quartos",
	"banheiros",
	"suites",
	"vagas",
	"padraoAcabamento",
	"estadoConservacao",
	"idadeEstimada",
	"infraestrutura",
	"servicosPublicos",
	"usosPredominantes",
	"viaAcesso",
	"regiaoContexto",
] as const;

const RAE_EXCLUDED_FIELDS = new Set([
	"id",
	"avaliadorId",
	"createdAt",
	"updatedAt",
]);

function resolveFields(rawFields: string | undefined): string[] {
	if (!rawFields) return [...DEFAULT_FIELDS];

	const fields = rawFields
		.split(",")
		.map((field) => field.trim())
		.filter((field) => field.length > 0);

	const invalid = fields.filter((field) => !ALLOWED_FIELDS_SET.has(field));
	if (invalid.length > 0) {
		throw status(400, {
			message: `Campos invalidos: ${invalid.join(", ")}`,
			camposPermitidos: ALLOWED_FIELDS,
		});
	}
	if (fields.length === 0) {
		throw status(400, { message: "Nenhum campo informado." });
	}

	return fields;
}

export abstract class Amostras {
	static async list(): Promise<SelectAmostra[]> {
		return db.select().from(amostras).orderBy(desc(amostras.createdAt));
	}

	static async getById(id: number): Promise<SelectAmostra> {
		const [row] = await db
			.select()
			.from(amostras)
			.where(eq(amostras.id, id))
			.limit(1);

		if (!row) notFound(id);
		return row;
	}

	static async create(data: AmostrasModel["insert"]): Promise<SelectAmostra> {
		await ensureAvaliadorExiste(data.avaliadorId);

		const [row] = await db
			.insert(amostras)
			.values(normalizeContato(data))
			.returning();
		if (!row) {
			throw status(500, { message: "Ocorreu um erro ao salvar a amostra." });
		}
		return row;
	}

	static async update(
		id: number,
		data: AmostrasModel["update"],
	): Promise<SelectAmostra> {
		if (data.avaliadorId !== undefined) {
			await ensureAvaliadorExiste(data.avaliadorId);
		}

		const [row] = await db
			.update(amostras)
			.set(normalizeContato(data))
			.where(eq(amostras.id, id))
			.returning();

		if (!row) notFound(id);
		return row;
	}

	static async remove(id: number): Promise<SelectAmostra> {
		const [row] = await db
			.delete(amostras)
			.where(eq(amostras.id, id))
			.returning();

		if (!row) notFound(id);
		return row;
	}

	static async extractFromPdf(file: File): Promise<AmostrasModel["extracted"]> {
		if (file.type !== "application/pdf") {
			throw status(400, { message: "O arquivo deve ser um pdf" });
		}

		const buffer = Buffer.from(await file.arrayBuffer());
		if (!buffer.subarray(0, 4).equals(PDF_MAGIC)) {
			throw status(400, { message: "O arquivo deve ser um pdf válido" });
		}

		const base64 = buffer.toString("base64");

		const response = await openai.chat.completions.create({
			model: "gpt-4o",
			temperature: 0,
			messages: [
				{ role: "system", content: SYSTEM_PROMPT },
				{
					role: "user",
					content: [
						{
							type: "file",
							file: {
								filename: file.name || "document.pdf",
								file_data: `data:application/pdf;base64,${base64}`,
							},
						},
					],
				},
			],
			response_format: {
				type: "json_schema",
				json_schema: {
					name: "amostra_extraido",
					strict: true,
					schema: {
						...JSON.parse(JSON.stringify(Model.extracted)),
						additionalProperties: false,
					},
				},
			},
		});

		const choice = response.choices?.[0];
		if (!choice) {
			throw status(500, { message: "Erro na OpenAI" });
		}

		const message = choice.message;

		if (message.refusal) {
			throw status(400, { message: message.refusal });
		}

		let parsed: unknown;
		try {
			parsed = JSON.parse(message.content ?? "");
		} catch {
			throw status(500, { message: "Erro na OpenAI" });
		}
		if (!Value.Check(Model.extracted, parsed)) {
			throw status(500, { message: "Erro na OpenAI" });
		}

		return normalizeContato(parsed);
	}

	static async generatePlanilha(
		query: AmostrasModel["planilhaQuery"],
	): Promise<{
		buffer: Buffer;
		filename: string;
	}> {
		const fields = resolveFields(query.fields);

		const rows = await db
			.select({
				...getTableColumns(amostras),
				avaliador: avaliadores.nome,
			})
			.from(amostras)
			.leftJoin(avaliadores, eq(amostras.avaliadorId, avaliadores.id))
			.orderBy(desc(amostras.createdAt));

		const workbook = new ExcelJS.Workbook();
		const sheet = workbook.addWorksheet("Amostras");

		sheet.columns = fields.map((field) => ({
			header: field,
			key: field,
			width: 25,
		}));
		sheet.getRow(1).font = { bold: true, size: 12 };

		for (const row of rows) {
			const record = row as Record<string, unknown>;
			sheet.addRow(
				fields.map((field) => {
					const resolver = FIELD_RESOLVERS[field];
					return cellValue(resolver ? resolver(record) : record[field]);
				}),
			);
		}

		const buffer = await workbook.xlsx.writeBuffer();
		return { buffer: Buffer.from(buffer), filename: "amostras.xlsx" };
	}

	static async generateRae(id: number): Promise<{
		buffer: Buffer;
		filename: string;
	}> {
		const [amostra] = await db
			.select()
			.from(amostras)
			.where(eq(amostras.id, id));

		if (!amostra) {
			throw status(404, { message: `Amostra com id: ${id} não encontrada` });
		}

		const [avaliador] = await db
			.select()
			.from(avaliadores)
			.where(eq(avaliadores.id, amostra.avaliadorId));

		const workbook = new ExcelJS.Workbook();
		const sheet = workbook.addWorksheet("Dados RAE");

		sheet.columns = [
			{ header: "Campo", key: "field", width: 25 },
			{ header: "Valor", key: "value", width: 50 },
		];
		sheet.getRow(1).font = { bold: true, size: 12 };

		if (avaliador) {
			writeEntries(sheet, Object.entries(avaliador), new Set(["id"]));
		}
		writeEntries(sheet, Object.entries(amostra), RAE_EXCLUDED_FIELDS);

		const buffer = await workbook.xlsx.writeBuffer();

		const rawFirst = amostra.proponente?.trim().split(" ")[0] ?? "";
		const safeFirst = sanitizeAsciiWord(rawFirst) || "cliente";

		return {
			buffer: Buffer.from(buffer),
			filename: `dados-rae-${safeFirst}.xlsx`,
		};
	}
}
