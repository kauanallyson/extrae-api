import { eq } from "drizzle-orm";
import type { Request, Response } from "express";
import ExcelJS from "exceljs";
import { db } from "@/config/db";
import { amostras } from "@/models/amostras";
import { avaliadores } from "@/models/avaliadores";
import { idParamsSchema } from "@/utils/schemas";

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

export async function downloadRae(req: Request, res: Response) {
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

  const rawFirst = amostra.proponente?.trim().split(" ")[0] ?? "";
  const safeFirst = rawFirst.replace(/[^a-zA-Z0-9À-ɏ]/g, "") || "cliente";
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="dados-rae-${safeFirst}.xlsx"`,
  );

  res.send(Buffer.from(buffer));
}
