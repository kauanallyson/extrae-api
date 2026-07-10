import { type Request, type Response, Router } from "express";
import multer from "multer";
import { z } from "zod";
import {
	insertAmostraSchema,
	updateAmostraSchema,
} from "@/models/amostras.model";
import * as amostrasService from "@/services/amostras.service";
import {
	extractAmostraFromPdf,
	generatePlanilha,
	generateRae,
} from "@/services/amostras.service";
import { amostrasFilterSchema } from "@/utils/amostras-filters";
import { HttpError } from "@/utils/http-error";
import { idParamsSchema } from "@/utils/schemas";
import { parse } from "@/utils/validate";

const similaresQuerySchema = z.object({
	raioKm: z.coerce.number().positive().default(5),
	limit: z.coerce.number().int().positive().default(5),
});

const SPREADSHEET_CONTENT_TYPE =
	"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const upload = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: 10 * 1024 * 1024 },
});

export const amostrasRouter = Router();

amostrasRouter.get("/planilha", async (req: Request, res: Response) => {
	const { buffer, filename } = await generatePlanilha(req.query);

	res.setHeader("Content-Type", SPREADSHEET_CONTENT_TYPE);
	res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
	res.send(buffer);
});

amostrasRouter.post(
	"/ia",
	upload.single("pdf"),
	async (req: Request, res: Response) => {
		if (!req.file) {
			throw new HttpError(400, { message: "PDF é obrigatório" });
		}
		res.json(await extractAmostraFromPdf(req.file));
	},
);

amostrasRouter.get("/:id/rae", async (req: Request, res: Response) => {
	const { id } = parse(idParamsSchema, req.params, "ID inválido");
	const { buffer, filename } = await generateRae(id);

	res.setHeader("Content-Type", SPREADSHEET_CONTENT_TYPE);
	res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
	res.send(buffer);
});

amostrasRouter.get("/", async (req: Request, res: Response) => {
	const filter = parse(amostrasFilterSchema, req.query, "Query inválida");
	res.json(await amostrasService.listAmostras(filter));
});

amostrasRouter.get("/:id/similares", async (req: Request, res: Response) => {
	const { id } = parse(idParamsSchema, req.params, "ID inválido");
	const options = parse(similaresQuerySchema, req.query, "Query inválida");
	res.json(await amostrasService.findAmostrasSimilares(id, options));
});

amostrasRouter.get("/:id", async (req: Request, res: Response) => {
	const { id } = parse(idParamsSchema, req.params, "ID inválido");
	res.json(await amostrasService.getAmostraById(id));
});

amostrasRouter.post("/", async (req: Request, res: Response) => {
	const data = parse(insertAmostraSchema, req.body, "Body inválido");
	res.status(201).json(await amostrasService.createAmostra(data));
});

amostrasRouter.put("/:id", async (req: Request, res: Response) => {
	const { id } = parse(idParamsSchema, req.params, "ID inválido");
	const data = parse(updateAmostraSchema, req.body, "Body inválido");
	res.json(await amostrasService.updateAmostra(id, data));
});

amostrasRouter.delete("/:id", async (req: Request, res: Response) => {
	const { id } = parse(idParamsSchema, req.params, "ID inválido");
	res.json(await amostrasService.deleteAmostra(id));
});
