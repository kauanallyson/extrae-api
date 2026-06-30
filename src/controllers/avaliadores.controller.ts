import { type Request, type Response, Router } from "express";
import {
	avaliadorInsertSchema,
	avaliadorUpdateSchema,
} from "@/models/avaliadores.model";
import * as avaliadoresService from "@/services/avaliadores.service";
import { idParamsSchema } from "@/utils/schemas";
import { parse } from "@/utils/validate";

export const avaliadoresRouter = Router();

avaliadoresRouter.get("/", async (_req: Request, res: Response) => {
	res.json(await avaliadoresService.listAvaliadores());
});

avaliadoresRouter.get("/:id", async (req: Request, res: Response) => {
	const { id } = parse(idParamsSchema, req.params, "ID inválido");
	res.json(await avaliadoresService.getAvaliadorById(id));
});

avaliadoresRouter.post("/", async (req: Request, res: Response) => {
	const data = parse(avaliadorInsertSchema, req.body, "Body inválido");
	res.status(201).json(await avaliadoresService.avaliadorCreate(data));
});

avaliadoresRouter.put("/:id", async (req: Request, res: Response) => {
	const { id } = parse(idParamsSchema, req.params, "ID inválido");
	const data = parse(avaliadorUpdateSchema, req.body, "Body inválido");
	res.json(await avaliadoresService.avaliadorUpdate(id, data));
});

avaliadoresRouter.delete("/:id", async (req: Request, res: Response) => {
	const { id } = parse(idParamsSchema, req.params, "ID inválido");
	res.json(await avaliadoresService.deleteAvaliador(id));
});
