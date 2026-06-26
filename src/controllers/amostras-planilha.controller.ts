import type { Request, Response } from "express";
import { generatePlanilha } from "@/services/amostras-planilha.service";

export async function downloadPlanilha(req: Request, res: Response) {
	const { buffer, filename } = await generatePlanilha(req.query);

	res.setHeader(
		"Content-Type",
		"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
	);
	res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
	res.send(buffer);
}
