import { desc } from "drizzle-orm";
import { Elysia } from "elysia";
import ExcelJS from "exceljs";
import { z } from "zod";
import { db } from "@/db";
import { amostras, amostrasSelectSchema } from "@/db/schema/amostras";
import {
	amostrasFilterSchema,
	buildAmostrasFilters,
} from "@/lib/amostras-filters";

const META_FIELDS = new Set(["id", "avaliadorId", "createdAt", "updatedAt"]);

// Colunas da amostra que podem virar coluna da planilha (exclui metadados)
const ALLOWED_FIELDS = Object.keys(amostrasSelectSchema.shape).filter(
	(field) => !META_FIELDS.has(field),
);
const ALLOWED_FIELDS_SET = new Set(ALLOWED_FIELDS);

// Conjunto padrao de colunas (ordem = ordem das colunas na planilha)
const DEFAULT_FIELDS = [
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

export const amostrasPlanilhaRoutes = new Elysia({ prefix: "/amostras" }).get(
	"/planilha",
	async ({ query, set, status }) => {
		// Resolve as colunas: override via ?fields=a,b,c ou conjunto padrao
		let fields: string[] = [...DEFAULT_FIELDS];
		if (query.fields) {
			fields = query.fields
				.split(",")
				.map((field) => field.trim())
				.filter((field) => field.length > 0);

			const invalid = fields.filter((field) => !ALLOWED_FIELDS_SET.has(field));
			if (invalid.length > 0) {
				return status(400, {
					message: `Campos invalidos: ${invalid.join(", ")}`,
					camposPermitidos: ALLOWED_FIELDS,
				});
			}
			if (fields.length === 0) {
				return status(400, { message: "Nenhum campo informado." });
			}
		}

		const filters = buildAmostrasFilters(query);
		if (!filters.ok) {
			return status(400, { message: filters.message });
		}

		const rows = await db
			.select()
			.from(amostras)
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
			sheet.addRow(
				fields.map((field) =>
					cellValue((row as Record<string, unknown>)[field]),
				),
			);
		}

		const buffer = await workbook.xlsx.writeBuffer();

		set.headers["Content-Type"] =
			"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
		set.headers["Content-Disposition"] = `attachment; filename="amostras.xlsx"`;

		return buffer;
	},
	{
		query: planilhaQuerySchema,
	},
);
