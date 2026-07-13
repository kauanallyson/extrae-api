import {
	and,
	desc,
	eq,
	getTableColumns,
	isNotNull,
	ne,
	type SQL,
} from "drizzle-orm";
import { status } from "elysia";
import ExcelJS from "exceljs";
import { zodResponseFormat } from "openai/helpers/zod";
import type { z } from "zod";
import { db } from "@/config/db";
import { openai } from "@/config/openai";
import { avaliadores } from "@/modules/avaliadores/model";
import { Avaliadores } from "@/modules/avaliadores/service";
import { buildAmostrasFilters } from "./filters";
import {
	type AmostrasModel,
	amostras,
	insertAmostraSchema,
	type SelectAmostra,
	selectAmostraSchema,
} from "./model";
import { SYSTEM_PROMPT } from "./prompt";
import {
	type AmostraSimilar,
	calcularScore,
	distanciaKm,
	type Estimativa,
	estimarValores,
	parseCoordenadaDms,
	type SimilaridadeAlvo,
} from "./similarity";

function notFound(id: number): never {
	throw status(404, { message: `Amostra ${id} nao encontrada.` });
}

async function ensureAvaliadorExiste(avaliadorId: number): Promise<void> {
	if (!(await Avaliadores.exists(avaliadorId))) {
		throw status(400, { message: "O avaliador informado nao existe." });
	}
}

export interface SimilaresResult {
	amostra: SelectAmostra;
	similares: AmostraSimilar[];
	estimativa: Estimativa | null;
}

export interface SimilaresPorCriteriosResult {
	similares: AmostraSimilar[];
	estimativa: Estimativa | null;
}

const aiSchema = insertAmostraSchema.omit({ avaliadorId: true }).required();

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
	...Object.keys(selectAmostraSchema.shape).filter(
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

function cellValue(value: unknown): string | number {
	if (value == null) return "";
	if (typeof value === "number") return value;
	if (Array.isArray(value)) {
		return value.map((item) => (item != null ? String(item) : "")).join(", ");
	}
	return String(value);
}

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

function writeEntries(
	sheet: ExcelJS.Worksheet,
	entries: [string, unknown][],
	excludedFields: Set<string> = new Set(),
): void {
	for (const [key, value] of entries) {
		if (excludedFields.has(key)) continue;

		if (Array.isArray(value)) {
			const row = sheet.addRow([key, ...value.map((item) => item ?? "")]);
			row.getCell(1).font = { bold: false };
		} else if (typeof value === "number") {
			sheet.addRow([key, value]);
		} else {
			sheet.addRow([key, value != null ? String(value) : ""]);
		}
	}
}

async function calcularSimilares(
	alvo: SimilaridadeAlvo,
	options: { raioKm: number; limit: number },
	invalidCoordsMessage: string,
	excludeId?: number,
): Promise<SimilaresPorCriteriosResult> {
	const alvoLat = parseCoordenadaDms(alvo.coordenadaS);
	const alvoLon = parseCoordenadaDms(alvo.coordenadaW);
	if (alvoLat === null || alvoLon === null) {
		throw status(422, { message: invalidCoordsMessage });
	}

	const conditions: SQL[] = [
		isNotNull(amostras.coordenadaS),
		isNotNull(amostras.coordenadaW),
		isNotNull(amostras.valorImovel),
		isNotNull(amostras.valorTerreno),
	];
	if (excludeId !== undefined) conditions.push(ne(amostras.id, excludeId));

	const candidatas = await db
		.select()
		.from(amostras)
		.where(and(...conditions));

	const dentroDoRaio: AmostraSimilar[] = [];
	for (const candidata of candidatas) {
		const lat = parseCoordenadaDms(candidata.coordenadaS);
		const lon = parseCoordenadaDms(candidata.coordenadaW);
		if (lat === null || lon === null) continue;

		const distKm = distanciaKm({ lat: alvoLat, lon: alvoLon }, { lat, lon });
		if (distKm > options.raioKm) continue;

		const score = calcularScore(alvo, candidata, distKm, options.raioKm);
		dentroDoRaio.push({ amostra: candidata, score, distanciaKm: distKm });
	}

	const similares = dentroDoRaio
		.sort((a, b) => b.score - a.score)
		.slice(0, options.limit);

	return {
		similares,
		estimativa: similares.length > 0 ? estimarValores(similares) : null,
	};
}

export abstract class Amostras {
	static async list(filter: AmostrasModel["filter"]): Promise<SelectAmostra[]> {
		const filters = buildAmostrasFilters(filter);
		if (!filters.ok) {
			throw status(400, { message: filters.message });
		}

		return db
			.select()
			.from(amostras)
			.where(filters.where)
			.orderBy(desc(amostras.createdAt));
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

	static async findSimilares(
		id: number,
		options: AmostrasModel["similaresQuery"],
	): Promise<SimilaresResult> {
		const alvo = await Amostras.getById(id);

		const resultado = await calcularSimilares(
			alvo,
			options,
			`Amostra ${id} nao possui coordenadas validas para calcular similares.`,
			id,
		);

		return { amostra: alvo, ...resultado };
	}

	static async findSimilaresPorCriterios(
		alvo: AmostrasModel["similaresAlvo"],
		options: AmostrasModel["similaresQuery"],
	): Promise<SimilaresPorCriteriosResult> {
		return calcularSimilares(
			alvo,
			options,
			"Coordenadas informadas nao sao validas para calcular similares.",
		);
	}

	static async create(data: AmostrasModel["insert"]): Promise<SelectAmostra> {
		await ensureAvaliadorExiste(data.avaliadorId);

		const [row] = await db.insert(amostras).values(data).returning();
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
			.set(data)
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

	static async extractFromPdf(file: File): Promise<z.infer<typeof aiSchema>> {
		if (file.type !== "application/pdf") {
			throw status(400, { message: "O arquivo deve ser um pdf" });
		}

		const buffer = Buffer.from(await file.arrayBuffer());
		if (!buffer.subarray(0, 4).equals(PDF_MAGIC)) {
			throw status(400, { message: "O arquivo deve ser um pdf válido" });
		}

		const base64 = buffer.toString("base64");

		const response = await openai.chat.completions.parse({
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
			response_format: zodResponseFormat(aiSchema, "amostra_extraido"),
		});

		const choice = response.choices?.[0];
		if (!choice) {
			throw status(500, { message: "Erro na OpenAI" });
		}

		const message = choice.message;

		if (message.refusal) {
			throw status(400, { message: message.refusal });
		}
		if (!message.parsed) {
			throw status(500, { message: "Erro na OpenAI" });
		}

		return message.parsed;
	}

	static async generatePlanilha(
		query: AmostrasModel["planilhaQuery"],
	): Promise<{
		buffer: Buffer;
		filename: string;
	}> {
		const fields = resolveFields(query.fields);

		const filters = buildAmostrasFilters(query);
		if (!filters.ok) {
			throw status(400, { message: filters.message });
		}

		const rows = await db
			.select({
				...getTableColumns(amostras),
				avaliador: avaliadores.nome,
			})
			.from(amostras)
			.leftJoin(avaliadores, eq(amostras.avaliadorId, avaliadores.id))
			.where(filters.where)
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
		const safeFirst =
			rawFirst
				.normalize("NFD")
				.replace(/[̀-ͯ]/g, "")
				.replace(/[^a-zA-Z0-9]/g, "") || "cliente";

		return {
			buffer: Buffer.from(buffer),
			filename: `dados-rae-${safeFirst}.xlsx`,
		};
	}
}
