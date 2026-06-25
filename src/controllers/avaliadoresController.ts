import { eq } from "drizzle-orm";
import type { Request, Response } from "express";
import { db } from "@/config/db";
import {
  avaliadores,
  avaliadoresInsertSchema,
  avaliadoresUpdateSchema,
} from "@/models/avaliadores";
import { mapDatabaseError } from "@/utils/db-errors";
import { idParamsSchema } from "@/utils/schemas";

export async function getAvaliadores(_req: Request, res: Response) {
  const result = await db.select().from(avaliadores).orderBy(avaliadores.id);
  res.json(result);
}

export async function getAvaliadorById(req: Request, res: Response) {
  const parsed = idParamsSchema.safeParse(req.params);
  if (!parsed.success) {
    return void res.status(400).json({ message: "ID inválido" });
  }

  const result = await db
    .select()
    .from(avaliadores)
    .where(eq(avaliadores.id, parsed.data.id))
    .limit(1);

  if (result.length === 0) {
    return void res.status(404).json({
      message: `Avaliador com id: ${parsed.data.id} não encontrado`,
    });
  }

  res.json(result[0]);
}

export async function createAvaliador(req: Request, res: Response) {
  const bodyParsed = avaliadoresInsertSchema.safeParse(req.body);
  if (!bodyParsed.success) {
    return void res.status(400).json({
      message: bodyParsed.error.issues[0]?.message ?? "Body inválido",
    });
  }

  try {
    const result = await db.insert(avaliadores).values(bodyParsed.data).returning();
    res.status(201).json(result[0]);
  } catch (e) {
    const response = mapDatabaseError(e, {
      conflict: "Ja existe um avaliador com estes dados.",
      foreignKey: "Nao foi possivel relacionar este avaliador.",
      invalid: "Os dados do avaliador sao invalidos.",
      default: "Ocorreu um erro ao salvar o avaliador.",
    });
    res.status(response.status).json(response.body);
  }
}

export async function updateAvaliador(req: Request, res: Response) {
  const paramsParsed = idParamsSchema.safeParse(req.params);
  if (!paramsParsed.success) {
    return void res.status(400).json({ message: "ID inválido" });
  }

  const bodyParsed = avaliadoresUpdateSchema.safeParse(req.body);
  if (!bodyParsed.success) {
    return void res.status(400).json({
      message: bodyParsed.error.issues[0]?.message ?? "Body inválido",
    });
  }

  try {
    const result = await db
      .update(avaliadores)
      .set(bodyParsed.data)
      .where(eq(avaliadores.id, paramsParsed.data.id))
      .returning();

    if (result.length === 0) {
      return void res.status(404).json({
        message: `Avaliador com id: ${paramsParsed.data.id} não encontrado`,
      });
    }

    res.status(200).json(result[0]);
  } catch (e) {
    const response = mapDatabaseError(e, {
      conflict: "Ja existe um avaliador com estes dados.",
      foreignKey: "Nao foi possivel relacionar este avaliador.",
      invalid: "Os dados do avaliador sao invalidos.",
      default: "Ocorreu um erro ao atualizar o avaliador.",
    });
    res.status(response.status).json(response.body);
  }
}

export async function deleteAvaliador(req: Request, res: Response) {
  const parsed = idParamsSchema.safeParse(req.params);
  if (!parsed.success) {
    return void res.status(400).json({ message: "ID inválido" });
  }

  try {
    const result = await db
      .delete(avaliadores)
      .where(eq(avaliadores.id, parsed.data.id))
      .returning();

    if (result.length === 0) {
      return void res.status(404).json({
        message: `Avaliador com id: ${parsed.data.id} não encontrado`,
      });
    }

    res.status(200).json(result[0]);
  } catch (e) {
    const response = mapDatabaseError(e, {
      conflict: "Ja existe um avaliador com estes dados.",
      foreignKey: "Nao foi possivel remover este avaliador pois possui amostras vinculadas.",
      invalid: "Os dados do avaliador sao invalidos.",
      default: "Ocorreu um erro ao remover o avaliador.",
    });
    res.status(response.status).json(response.body);
  }
}
