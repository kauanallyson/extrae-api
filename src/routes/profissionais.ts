import { eq } from "drizzle-orm";
import { Elysia } from "elysia";
import { z } from "zod";
import { db } from "@/db";
import {
  profissionais,
  profissionaisInsertSchema,
  profissionaisUpdateSchema,
} from "@/db/schema/profissionais";
import { isValidCnpj, isValidCpf } from "@/lib/cpf-cnpj";

export const profissionaisRoutes = new Elysia({ prefix: "/profissionais" })
  // get all
  .get("/", async () => {
    const result = await db
      .select()
      .from(profissionais)
      .orderBy(profissionais.nome);
    return result;
  })
  // find by id
  .get(
    "/:id",
    async ({ params: { id }, status }) => {
      const result = await db
        .select()
        .from(profissionais)
        .where(eq(profissionais.id, id))
        .limit(1);
      if (result.length === 0) {
        return status(404, {
          message: `Profissional com id: ${id} não encontrado`,
        });
      }
      return result[0];
    },
    {
      params: z.object({
        id: z.coerce.number(),
      }),
    },
  )
  // create profissional
  .post(
    "/",
    async ({ body, status }) => {
      try {
        if (body.cpf && !isValidCpf(body.cpf)) {
          return status(400, { message: "CPF inválido" });
        }
        if (body.cnpj && !isValidCnpj(body.cnpj)) {
          return status(400, { message: "CNPJ inválido" });
        }
        const result = await db.insert(profissionais).values(body).returning();
        return status(201, result[0]);
      } catch (e) {
        return status(500, { message: "Ocorreu um erro.", error: `${e}` });
      }
    },
    { body: profissionaisInsertSchema },
  )
  // update profissional
  .put(
    "/:id",
    async ({ params: { id }, body, status }) => {
      try {
        if (body.cpf && !isValidCpf(body.cpf)) {
          return status(400, { message: "CPF inválido" });
        }
        if (body.cnpj && !isValidCnpj(body.cnpj)) {
          return status(400, { message: "CNPJ inválido" });
        }
        const result = await db
          .update(profissionais)
          .set(body)
          .where(eq(profissionais.id, id))
          .returning();
        return status(200, result[0]);
      } catch (e) {
        return status(500, { message: "Ocorreu um erro.", error: `${e}` });
      }
    },
    {
      body: profissionaisUpdateSchema,
      params: z.object({
        id: z.coerce.number(),
      }),
    },
  )
  // delete profissional
  .delete(
    "/:id",
    async ({ params: { id }, status }) => {
      const result = await db
        .delete(profissionais)
        .where(eq(profissionais.id, id))
        .returning();
      if (result.length === 0) {
        return status(404, {
          message: `Profissional com id: ${id} não encontrado`,
        });
      }
      return status(200, result[0]);
    },
    {
      params: z.object({
        id: z.coerce.number(),
      }),
    },
  );
