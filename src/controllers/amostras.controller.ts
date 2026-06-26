import type { Request, Response } from "express";
import {
	amostrasInsertSchema,
	amostrasUpdateSchema,
} from "@/models/amostras.model";
import * as amostrasService from "@/services/amostras.service";
import { amostrasFilterSchema } from "@/utils/amostras-filters";
import { idParamsSchema } from "@/utils/schemas";
import { parse } from "@/utils/validate";

export async function getAmostras(req: Request, res: Response) {
	const filter = parse(amostrasFilterSchema, req.query, "Query inválida");
	res.json(await amostrasService.listAmostras(filter));
}

export async function getAmostraById(req: Request, res: Response) {
	const { id } = parse(idParamsSchema, req.params, "ID inválido");
	res.json(await amostrasService.getAmostraById(id));
}

export async function createAmostra(req: Request, res: Response) {
	const data = parse(amostrasInsertSchema, req.body, "Body inválido");
	res.status(201).json(await amostrasService.createAmostra(data));
}

export async function updateAmostra(req: Request, res: Response) {
	const { id } = parse(idParamsSchema, req.params, "ID inválido");
	const data = parse(amostrasUpdateSchema, req.body, "Body inválido");
	res.json(await amostrasService.updateAmostra(id, data));
}

export async function deleteAmostra(req: Request, res: Response) {
	const { id } = parse(idParamsSchema, req.params, "ID inválido");
	res.json(await amostrasService.deleteAmostra(id));
}
