import { desc, eq, getTableColumns } from "drizzle-orm";
import ExcelJS from "exceljs";
import { z } from "zod";
import { db } from "@/config/db";
import { amostras, amostrasSelectSchema } from "@/models/amostras.model";
import { avaliadores } from "@/models/avaliadores.model";
import {
	amostrasFilterSchema,
	buildAmostrasFilters,
} from "@/utils/amostras-filters";
import { HttpError } from "@/utils/http-error";

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
	...Object.keys(amostrasSelectSchema.shape).filter(
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

export async function generatePlanilha(rawQuery: unknown) {
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
