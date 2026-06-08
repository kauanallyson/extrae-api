import { and, desc, eq, gte, lte, type SQL } from "drizzle-orm";
import { Elysia } from "elysia";
import ExcelJS from "exceljs";
import { z } from "zod";
import { db } from "@/db";
import { amostras, amostrasSelectSchema } from "@/db/schema/amostras";

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

const planilhaQuerySchema = z.object({
	from: z.string().optional(),
	to: z.string().optional(),
	municipio: z.string().optional(),
	uf: z.string().length(2).optional(),
	fields: z.string().optional(),
});

function parseDate(value: string | undefined): Date | null | undefined {
	if (value === undefined) return undefined;
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? null : date;
}

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

		const from = parseDate(query.from);
		const to = parseDate(query.to);
		if (from === null || to === null) {
			return status(400, {
				message: "Data invalida em 'from' ou 'to'.",
			});
		}

		const filters: SQL[] = [];
		if (from) filters.push(gte(amostras.createdAt, from));
		if (to) filters.push(lte(amostras.createdAt, to));
		if (query.municipio) filters.push(eq(amostras.municipio, query.municipio));
		if (query.uf) filters.push(eq(amostras.uf, query.uf));

		const rows = await db
			.select()
			.from(amostras)
			.where(filters.length > 0 ? and(...filters) : undefined)
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
