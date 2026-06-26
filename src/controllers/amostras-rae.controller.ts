import type { Request, Response } from "express";
import { generateRae } from "@/services/amostras-rae.service";
import { idParamsSchema } from "@/utils/schemas";
import { parse } from "@/utils/validate";

export async function downloadRae(req: Request, res: Response) {
	const { id } = parse(idParamsSchema, req.params, "ID inválido");
	const { buffer, filename } = await generateRae(id);

	res.setHeader(
		"Content-Type",
		"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
	);
	res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
	res.send(buffer);
}
