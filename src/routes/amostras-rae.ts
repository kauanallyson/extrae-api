import { eq } from "drizzle-orm";
import { Elysia, t } from "elysia";
import ExcelJS from "exceljs";
import { db } from "@/db";
import { amostras } from "@/db/schema/amostra";
import { avaliadores } from "@/db/schema/avaliadores";

const EXCLUDED_FIELDS = new Set([
	"id",
	"textoExtraido",
	"avaliadorId",
	"createdAt",
	"updatedAt",
]);

function writeEntries(
	sheet: ExcelJS.Worksheet,
	entries: [string, unknown][],
	excludedFields: Set<string> = new Set(),
) {
	for (const [key, value] of entries) {
		if (excludedFields.has(key)) continue;

		if (Array.isArray(value)) {
			const row = sheet.addRow([key, ...value.map((item) => item ?? "")]);
			row.getCell(1).font = { bold: false };
		} else {
			sheet.addRow([key, value != null ? String(value) : ""]);
		}
	}
}

export const amostrasRaeRoutes = new Elysia({ prefix: "/amostras" }).get(
	"/:amostraId/rae",
	async ({ params: { amostraId }, headers, status }) => {
		const [amostra] = await db
			.select()
			.from(amostras)
			.where(eq(amostras.id, amostraId));

		if (!amostra) {
			return status(404, {
				message: `Amostra com id: ${amostraId} não encontrada`,
			});
		}

		// Busca o avaliador vinculado ao amostra
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

		// Escreve os dados do avaliador primeiro (sem o id)
		if (avaliador) {
			writeEntries(sheet, Object.entries(avaliador), new Set(["id"]));
		}

		// Escreve os dados do amostra (sem id, avaliadorId, createdAt, updatedAt)
		writeEntries(sheet, Object.entries(amostra), EXCLUDED_FIELDS);

		const buffer = await workbook.xlsx.writeBuffer();

		headers["Content-Type"] =
			"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

		const firstName = amostra.proponente?.trim().split(" ")[0] ?? "cliente";
		headers["Content-Disposition"] =
			`attachment; filename="dados-rae-${firstName}.xlsx"`;

		return buffer;
	},
	{
		params: t.Object({
			amostraId: t.Numeric(),
		}),
	},
);
