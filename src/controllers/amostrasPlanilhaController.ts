import { desc, eq, getTableColumns } from "drizzle-orm";
import type { Request, Response } from "express";
import ExcelJS from "exceljs";
import { z } from "zod";
import { db } from "@/config/db";
import { amostras, amostrasSelectSchema } from "@/models/amostras";
import { avaliadores } from "@/models/avaliadores";
import { amostrasFilterSchema, buildAmostrasFilters } from "@/utils/amostras-filters";

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

export async function downloadPlanilha(req: Request, res: Response) {
  const parsed = planilhaQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return void res
      .status(400)
      .json({ message: parsed.error.issues[0]?.message ?? "Query inválida" });
  }

  const query = parsed.data;

  let fields: string[] = [...DEFAULT_FIELDS];
  if (query.fields) {
    fields = query.fields
      .split(",")
      .map((field) => field.trim())
      .filter((field) => field.length > 0);

    const invalid = fields.filter((field) => !ALLOWED_FIELDS_SET.has(field));
    if (invalid.length > 0) {
      return void res.status(400).json({
        message: `Campos invalidos: ${invalid.join(", ")}`,
        camposPermitidos: ALLOWED_FIELDS,
      });
    }
    if (fields.length === 0) {
      return void res.status(400).json({ message: "Nenhum campo informado." });
    }
  }

  const filters = buildAmostrasFilters(query);
  if (!filters.ok) {
    return void res.status(400).json({ message: filters.message });
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

  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
  res.setHeader("Content-Disposition", `attachment; filename="amostras.xlsx"`);
  res.send(Buffer.from(buffer));
}
