import type { Request, Response } from "express";
import { zodResponseFormat } from "openai/helpers/zod";
import { amostrasInsertSchema } from "@/models/amostras";
import { openai } from "@/services/openai";
import { SYSTEM_PROMPT } from "@/services/prompt";

const aiSchema = amostrasInsertSchema.omit({
  avaliadorId: true,
  createdAt: true,
  updatedAt: true,
});

export async function extractAmostraFromPdf(req: Request, res: Response) {
  if (!req.file) {
    return void res.status(400).json({ message: "PDF é obrigatório" });
  }
  if (req.file.mimetype !== "application/pdf") {
    return void res.status(400).json({ message: "O arquivo deve ser um pdf" });
  }

  const pdfMagic = Buffer.from([0x25, 0x50, 0x44, 0x46]);
  if (!req.file.buffer.subarray(0, 4).equals(pdfMagic)) {
    return void res.status(400).json({ message: "O arquivo deve ser um pdf válido" });
  }

  const base64 = req.file.buffer.toString("base64");

  const response = await openai.chat.completions.parse({
    model: "gpt-4o-mini",
    temperature: 0,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: [
          {
            type: "file",
            file: {
              filename: req.file.originalname ?? "document.pdf",
              file_data: `data:application/pdf;base64,${base64}`,
            },
          },
        ],
      },
    ],
    response_format: zodResponseFormat(aiSchema, "amostra_extraido"),
  });

  const message = response.choices[0].message;

  if (message.refusal) {
    return void res.status(400).json({ message: message.refusal });
  }

  if (!message.parsed) {
    return void res.status(500).json({ message: "Erro na OpenAI" });
  }

  res.json(message.parsed);
}
