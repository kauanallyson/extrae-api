import { desc, eq, getTableColumns } from "drizzle-orm";
import ExcelJS from "exceljs";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
import { db } from "@/config/db";
import { openai } from "@/config/openai";
import {
	amostras,
	type InsertAmostra,
	insertAmostraSchema,
	type SelectAmostra,
	selectAmostraSchema,
	type UpdateAmostra,
} from "@/models/amostras.model";
import { avaliadores } from "@/models/avaliadores.model";
import {
	createAmostra as createAmostraRepo,
	deleteById,
	findAll,
	findById,
	findSimilaresCandidates,
	updateAmostra as updateAmostraRepo,
} from "@/repo/amostras.repo";
import {
	amostrasFilterSchema,
	buildAmostrasFilters,
} from "@/utils/amostras-filters";
import {
	type AmostraSimilar,
	calcularScore,
	distanciaKm,
	type Estimativa,
	estimarValores,
	parseCoordenadaDms,
} from "@/utils/amostras-similarity";
import { mapDatabaseError } from "@/utils/db-errors";
import { HttpError } from "@/utils/http-error";
import { SYSTEM_PROMPT } from "@/utils/prompt";

type AmostraFilter = z.infer<typeof amostrasFilterSchema>;

const WRITE_ERRORS = {
	conflict: "Ja existe uma amostra com estes dados.",
	foreignKey: "O avaliador informado nao existe.",
	invalid: "Os dados da amostra sao invalidos.",
};

function notFound(id: number): HttpError {
	return new HttpError(404, { message: `Amostra ${id} nao encontrada.` });
}

export async function listAmostras(
	filter: AmostraFilter,
): Promise<SelectAmostra[]> {
	const filters = buildAmostrasFilters(filter);
	if (!filters.ok) {
		throw new HttpError(400, { message: filters.message });
	}

	return findAll(filters.where);
}

export async function getAmostraById(id: number): Promise<SelectAmostra> {
	const row = await findById(id);
	if (!row) throw notFound(id);
	return row;
}

export interface SimilaresResult {
	amostra: SelectAmostra;
	similares: Array<{
		amostra: SelectAmostra;
		score: number;
		distanciaKm: number;
	}>;
	estimativa: Estimativa | null;
}

export async function findAmostrasSimilares(
	id: number,
	options: { raioKm: number; limit: number },
): Promise<SimilaresResult> {
	const alvo = await findById(id);
	if (!alvo) throw notFound(id);

	const alvoLat = parseCoordenadaDms(alvo.coordenadaS);
	const alvoLon = parseCoordenadaDms(alvo.coordenadaW);
	if (alvoLat === null || alvoLon === null) {
		throw new HttpError(422, {
			message: `Amostra ${id} nao possui coordenadas validas para calcular similares.`,
		});
	}

	const candidatas = await findSimilaresCandidates(id);

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
		amostra: alvo,
		similares,
		estimativa: similares.length > 0 ? estimarValores(similares) : null,
	};
}

export async function createAmostra(
	data: InsertAmostra,
): Promise<SelectAmostra> {
	try {
		const row = await createAmostraRepo(data);
		if (!row) {
			throw new HttpError(500, {
				message: "Ocorreu um erro ao salvar a amostra.",
			});
		}
		return row;
	} catch (e) {
		if (e instanceof HttpError) throw e;
		const response = mapDatabaseError(e, {
			...WRITE_ERRORS,
			default: "Ocorreu um erro ao salvar a amostra.",
		});
		throw new HttpError(response.status, response.body);
	}
}

export async function updateAmostra(
	id: number,
	data: UpdateAmostra,
): Promise<SelectAmostra> {
	try {
		const row = await updateAmostraRepo(id, data);
		if (!row) throw notFound(id);
		return row;
	} catch (e) {
		if (e instanceof HttpError) throw e;
		const response = mapDatabaseError(e, {
			...WRITE_ERRORS,
			default: "Ocorreu um erro ao atualizar a amostra.",
		});
		throw new HttpError(response.status, response.body);
	}
}

export async function deleteAmostra(id: number): Promise<SelectAmostra> {
	try {
		const row = await deleteById(id);
		if (!row) throw notFound(id);
		return row;
	} catch (e) {
		if (e instanceof HttpError) throw e;
		const response = mapDatabaseError(e, {
			...WRITE_ERRORS,
			default: "Ocorreu um erro ao remover a amostra.",
		});
		throw new HttpError(response.status, response.body);
	}
}

// ---------------------------------------------------------------------------
// AI extraction
// ---------------------------------------------------------------------------

const aiSchema = insertAmostraSchema.omit({ avaliadorId: true }).required();

const PDF_MAGIC = Buffer.from([0x25, 0x50, 0x44, 0x46]);

export async function extractAmostraFromPdf(
	file: Express.Multer.File,
): Promise<z.infer<typeof aiSchema>> {
	if (file.mimetype !== "application/pdf") {
		throw new HttpError(400, { message: "O arquivo deve ser um pdf" });
	}
	if (!file.buffer.subarray(0, 4).equals(PDF_MAGIC)) {
		throw new HttpError(400, { message: "O arquivo deve ser um pdf válido" });
	}

	const base64 = file.buffer.toString("base64");

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
							filename: file.originalname ?? "document.pdf",
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
		throw new HttpError(500, { message: "Erro na OpenAI" });
	}

	const message = choice.message;

	if (message.refusal) {
		throw new HttpError(400, { message: message.refusal });
	}
	if (!message.parsed) {
		throw new HttpError(500, { message: "Erro na OpenAI" });
	}

	return message.parsed;
}

// ---------------------------------------------------------------------------
// Planilha (xlsx export)
// ---------------------------------------------------------------------------

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

const planilhaQuerySchema = amostrasFilterSchema.extend({
	fields: z.string().optional(),
});

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
		throw new HttpError(400, {
			message: `Campos invalidos: ${invalid.join(", ")}`,
			camposPermitidos: ALLOWED_FIELDS,
		});
	}
	if (fields.length === 0) {
		throw new HttpError(400, { message: "Nenhum campo informado." });
	}

	return fields;
}

export async function generatePlanilha(rawQuery: unknown): Promise<{
	buffer: Buffer<ExcelJS.Buffer>;
	filename: string;
}> {
	const parsed = planilhaQuerySchema.safeParse(rawQuery);
	if (!parsed.success) {
		throw new HttpError(400, {
			message: parsed.error.issues[0]?.message ?? "Query inválida",
		});
	}

	const query = parsed.data;
	const fields = resolveFields(query.fields);

	const filters = buildAmostrasFilters(query);
	if (!filters.ok) {
		throw new HttpError(400, { message: filters.message });
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

// ---------------------------------------------------------------------------
// RAE (single-amostra xlsx export)
// ---------------------------------------------------------------------------

const RAE_EXCLUDED_FIELDS = new Set([
	"id",
	"avaliadorId",
	"createdAt",
	"updatedAt",
]);

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

export async function generateRae(id: number): Promise<{
	buffer: Buffer<ExcelJS.Buffer>;
	filename: string;
}> {
	const [amostra] = await db.select().from(amostras).where(eq(amostras.id, id));

	if (!amostra) {
		throw new HttpError(404, {
			message: `Amostra com id: ${id} não encontrada`,
		});
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
