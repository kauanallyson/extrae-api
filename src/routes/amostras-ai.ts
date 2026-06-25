import { Router } from "express";
import multer from "multer";
import { zodResponseFormat } from "openai/helpers/zod";
import { amostrasInsertSchema } from "@/db/schema/amostras";
import { openai } from "@/lib/ai/openai";
import { SYSTEM_PROMPT } from "@/lib/ai/prompt";

const upload = multer({ storage: multer.memoryStorage() });

const aiSchema = amostrasInsertSchema
  .omit({
    avaliadorId: true,
    createdAt: true,
    updatedAt: true,
  })
  .required();

export const amostrasAiRouter = Router();

amostrasAiRouter.post("/", upload.single("pdf"), async (req, res) => {
  if (!req.file) {
    return void res.status(400).json({ message: "PDF é obrigatório" });
  }
  if (req.file.mimetype !== "application/pdf") {
    return void res.status(400).json({ message: "O arquivo deve ser um pdf" });
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
});
