import type { Request, Response } from "express";
import { extractAmostraFromPdf as extractFromPdf } from "@/services/amostras-ai.service";
import { HttpError } from "@/utils/http-error";

export async function extractAmostraFromPdf(req: Request, res: Response) {
	if (!req.file) {
		throw new HttpError(400, { message: "PDF é obrigatório" });
	}
	res.json(await extractFromPdf(req.file));
}
