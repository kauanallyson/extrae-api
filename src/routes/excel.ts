import { eq } from "drizzle-orm";
import { Elysia } from "elysia";
import ExcelJS from "exceljs";
import { z } from "zod";
import { db } from "@/db";
import { dadosRae } from "@/db/schema/dadosRae";
import { laudos } from "@/db/schema/laudo";
import { betterAuthPlugin } from "@/middleware/better-auth";

export const excelRoutes = new Elysia({ prefix: "/gerar-excel-rae" })
  .use(betterAuthPlugin)
  .get(
    "/:laudoId",
    async ({ params: { laudoId }, headers, status }) => {
      const [laudo] = await db
        .select()
        .from(laudos)
        .where(eq(laudos.id, laudoId));

      if (!laudo?.dadosRaeId) {
        return status(400, { message: "Laudo or RAE not found" });
      }

      const [rae] = await db
        .select()
        .from(dadosRae)
        .where(eq(dadosRae.id, laudo.dadosRaeId));

      if (!rae) {
        return status(400, { message: "RAE Data not found" });
      }

      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Dados RAE");

      sheet.columns = [
        { header: "Campo", key: "field", width: 25 },
        { header: "Valor", key: "value", width: 50 },
      ];

      sheet.getRow(1).font = { bold: true, size: 12 };

      // Add all properties of the RAE record vertically (field vertically)
      Object.entries(rae).forEach(([key, value]) => {
        let formattedValue = value;
        if (Array.isArray(value)) {
          formattedValue = value.join(", ");
        } else if (value === null || value === undefined) {
          formattedValue = "";
        }

        sheet.addRow({
          field: key,
          value: String(formattedValue),
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();

      headers["Content-Type"] =
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

      const firstName = rae.proponente?.trim().split(" ")[0];
      headers["Content-Disposition"] =
        `attachment; filename="dados-rae-${firstName}.xlsx"`;

      return buffer;
    },
    {
      auth: true,
      params: z.object({
        laudoId: z.number(),
      }),
    },
  );
