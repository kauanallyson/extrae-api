import { Elysia } from "elysia";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
import { db } from "@/db";
import {
  dadosAmostra,
  insertDadosAmostraSchema,
} from "@/db/schema/dadosAmostra";
import { dadosRae, insertDadosRaeSchema } from "@/db/schema/dadosRae";
import { insertLaudosSchema, laudos } from "@/db/schema/laudo";
import { openai } from "@/lib/ai/openai";
import { SYSTEM_PROMPT } from "@/lib/ai/prompt";
import { betterAuthPlugin } from "@/middleware/better-auth";

const laudoSchema = z.object({
  ...insertDadosRaeSchema.shape,
  ...insertDadosAmostraSchema.shape,
});

export type LaudoExtraido = z.infer<typeof laudoSchema>;

export const laudoRoutes = new Elysia({ prefix: "/gerar-laudo-ia" })
  .use(betterAuthPlugin)
  .post(
    "/",
    async ({ body: { laudoText, profissionalId } }) => {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0.1, // menos criativo o possivel
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `
						==============\n
						TEXTO DO LAUDO\n
						==============\n
                    	${laudoText}`,
          },
        ],
        response_format: zodResponseFormat(laudoSchema, "laudo_extraido"),
      });
      const text = response.choices[0].message.content;
      if (!text) throw new Error("Erro na OpenAI");

      const result = laudoSchema.parse(JSON.parse(text));

      const raeData = insertDadosRaeSchema.parse(result);
      const [rae] = await db.insert(dadosRae).values(raeData).returning();

      const amostraData = insertDadosAmostraSchema.parse(result);
      const [amostra] = await db
        .insert(dadosAmostra)
        .values(amostraData)
        .returning();

      const laudoData = insertLaudosSchema.parse({
        profissionalId: profissionalId,
        textoExtraido: laudoText,
        dadosAmostraId: amostra.id,
        dadosRaeId: rae.id,
      });

      const [laudo] = await db.insert(laudos).values(laudoData).returning();

      return {
        laudoId: laudo.id,
      };
    },
    {
      auth: true,
      body: z.object({
        laudoText: z.string(),
        profissionalId: z.number(),
      }),
    },
  );
