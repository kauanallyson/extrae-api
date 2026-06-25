import { desc, eq } from "drizzle-orm";
import { Router } from "express";
import { db } from "@/db";
import {
  amostras,
  amostrasInsertSchema,
  amostrasUpdateSchema,
} from "@/db/schema/amostras";
import {
  amostrasFilterSchema,
  buildAmostrasFilters,
} from "@/lib/amostras-filters";
import { mapDatabaseError } from "@/lib/http";
import { idParamsSchema } from "@/lib/schemas";

export const amostrasRouter = Router();

amostrasRouter.get("/", async (req, res) => {
  const parsed = amostrasFilterSchema.safeParse(req.query);
  if (!parsed.success) {
    return void res
      .status(400)
      .json({ message: parsed.error.issues[0]?.message ?? "Query inválida" });
  }

  const filters = buildAmostrasFilters(parsed.data);
  if (!filters.ok) {
    return void res.status(400).json({ message: filters.message });
  }

  const result = await db
    .select()
    .from(amostras)
    .where(filters.where)
    .orderBy(desc(amostras.createdAt));
  res.json(result);
});

amostrasRouter.get("/:id", async (req, res) => {
  const parsed = idParamsSchema.safeParse(req.params);
  if (!parsed.success) {
    return void res.status(400).json({ message: "ID inválido" });
  }

  const result = await db
    .select()
    .from(amostras)
    .where(eq(amostras.id, parsed.data.id))
    .limit(1);

  if (result.length === 0) {
    return void res.status(404).json({
      message: `Amostra com id: ${parsed.data.id} não encontrada`,
    });
  }

  res.json(result[0]);
});

amostrasRouter.post("/", async (req, res) => {
  const bodyParsed = amostrasInsertSchema.safeParse(req.body);
  if (!bodyParsed.success) {
    return void res.status(400).json({
      message: bodyParsed.error.issues[0]?.message ?? "Body inválido",
    });
  }

  try {
    const result = await db
      .insert(amostras)
      .values(bodyParsed.data)
      .returning();
    res.status(201).json(result[0]);
  } catch (e) {
    const response = mapDatabaseError(e, {
      conflict: "Ja existe uma amostra com estes dados.",
      foreignKey: "O avaliador informado nao existe.",
      invalid: "Os dados da amostra sao invalidos.",
      default: "Ocorreu um erro ao salvar a amostra.",
    });

    res.status(response.status).json(response.body);
  }
});

amostrasRouter.put("/:id", async (req, res) => {
  const paramsParsed = idParamsSchema.safeParse(req.params);
  if (!paramsParsed.success) {
    return void res.status(400).json({ message: "ID inválido" });
  }

  const bodyParsed = amostrasUpdateSchema.safeParse(req.body);
  if (!bodyParsed.success) {
    return void res.status(400).json({
      message: bodyParsed.error.issues[0]?.message ?? "Body inválido",
    });
  }

  try {
    const result = await db
      .update(amostras)
      .set(bodyParsed.data)
      .where(eq(amostras.id, paramsParsed.data.id))
      .returning();

    if (result.length === 0) {
      return void res.status(404).json({
        message: `Amostra com id: ${paramsParsed.data.id} não encontrada`,
      });
    }

    res.status(200).json(result[0]);
  } catch (e) {
    const response = mapDatabaseError(e, {
      conflict: "Ja existe uma amostra com estes dados.",
      foreignKey: "O avaliador informado nao existe.",
      invalid: "Os dados da amostra sao invalidos.",
      default: "Ocorreu um erro ao atualizar a amostra.",
    });

    res.status(response.status).json(response.body);
  }
});

amostrasRouter.delete("/:id", async (req, res) => {
  const parsed = idParamsSchema.safeParse(req.params);
  if (!parsed.success) {
    return void res.status(400).json({ message: "ID inválido" });
  }

  const result = await db
    .delete(amostras)
    .where(eq(amostras.id, parsed.data.id))
    .returning();

  if (result.length === 0) {
    return void res.status(404).json({
      message: `Amostra com id: ${parsed.data.id} não encontrada`,
    });
  }

  res.status(200).json(result[0]);
});
