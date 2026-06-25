import { eq } from "drizzle-orm";
import { Router } from "express";
import ExcelJS from "exceljs";
import { db } from "@/db";
import { amostras } from "@/db/schema/amostras";
import { avaliadores } from "@/db/schema/avaliadores";
import { idParamsSchema } from "@/lib/schemas";

const EXCLUDED_FIELDS = new Set([
	"id",
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
		} else if (typeof value === "number") {
			sheet.addRow([key, value]);
		} else {
			sheet.addRow([key, value != null ? String(value) : ""]);
		}
	}
}

export const amostrasRaeRouter = Router();

amostrasRaeRouter.get("/:id/rae", async (req, res) => {
	const parsed = idParamsSchema.safeParse(req.params);
	if (!parsed.success) {
		return void res.status(400).json({ message: "ID inválido" });
	}

	const [amostra] = await db
		.select()
		.from(amostras)
		.where(eq(amostras.id, parsed.data.id));

	if (!amostra) {
		return void res.status(404).json({
			message: `Amostra com id: ${parsed.data.id} não encontrada`,
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

	writeEntries(sheet, Object.entries(amostra), EXCLUDED_FIELDS);

	const buffer = await workbook.xlsx.writeBuffer();

	res.setHeader(
		"Content-Type",
		"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
	);

	const firstName = amostra.proponente?.trim().split(" ")[0] ?? "cliente";
	res.setHeader(
		"Content-Disposition",
		`attachment; filename="dados-rae-${firstName}.xlsx"`,
	);

	res.send(Buffer.from(buffer));
});
