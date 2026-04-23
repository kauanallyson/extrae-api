import { eq } from "drizzle-orm";
import { Elysia } from "elysia";
import ExcelJS from "exceljs";
import { z } from "zod";
import { db } from "@/db";
import { laudos } from "@/db/schema/laudo";
import { profissionais } from "@/db/schema/profissionais";

const EXCLUDED_FIELDS = new Set([
	"id",
	"textoExtraido",
	"profissionalId",
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

export const excelRoutes = new Elysia({ prefix: "/gerar-excel-rae" }).get(
	"/:laudoId",
	async ({ params: { laudoId }, headers, status }) => {
		const [laudo] = await db
			.select()
			.from(laudos)
			.where(eq(laudos.id, laudoId));

		if (!laudo) {
			return status(400, { message: "Laudo not found" });
		}

		// Busca o profissional vinculado ao laudo
		const [profissional] = await db
			.select()
			.from(profissionais)
			.where(eq(profissionais.id, laudo.profissionalId));

		const workbook = new ExcelJS.Workbook();
		const sheet = workbook.addWorksheet("Dados RAE");

		sheet.columns = [
			{ header: "Campo", key: "field", width: 25 },
			{ header: "Valor", key: "value", width: 50 },
		];

		sheet.getRow(1).font = { bold: true, size: 12 };

		// Escreve os dados do profissional primeiro (sem o id)
		if (profissional) {
			writeEntries(sheet, Object.entries(profissional), new Set(["id"]));
		}

		// Escreve os dados do laudo (sem id, profissionalId, createdAt, updatedAt)
		writeEntries(sheet, Object.entries(laudo), EXCLUDED_FIELDS);

		const buffer = await workbook.xlsx.writeBuffer();

		headers["Content-Type"] =
			"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

		const firstName = laudo.proponente?.trim().split(" ")[0] ?? "cliente";
		headers["Content-Disposition"] =
			`attachment; filename="dados-rae-${firstName}.xlsx"`;

		return buffer;
	},
	{
		params: z.object({
			laudoId: z.coerce.number(),
		}),
	},
);
