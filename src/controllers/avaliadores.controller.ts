import type { Request, Response } from "express";
import {
	avaliadoresInsertSchema,
	avaliadoresUpdateSchema,
} from "@/models/avaliadores.model";
import * as avaliadoresService from "@/services/avaliadores.service";
import { idParamsSchema } from "@/utils/schemas";
import { parse } from "@/utils/validate";

export async function getAvaliadores(_req: Request, res: Response) {
	res.json(await avaliadoresService.listAvaliadores());
}

export async function getAvaliadorById(req: Request, res: Response) {
	const { id } = parse(idParamsSchema, req.params, "ID inválido");
	res.json(await avaliadoresService.getAvaliadorById(id));
}

export async function createAvaliador(req: Request, res: Response) {
	const data = parse(avaliadoresInsertSchema, req.body, "Body inválido");
	res.status(201).json(await avaliadoresService.createAvaliador(data));
}

export async function updateAvaliador(req: Request, res: Response) {
	const { id } = parse(idParamsSchema, req.params, "ID inválido");
	const data = parse(avaliadoresUpdateSchema, req.body, "Body inválido");
	res.json(await avaliadoresService.updateAvaliador(id, data));
}

export async function deleteAvaliador(req: Request, res: Response) {
	const { id } = parse(idParamsSchema, req.params, "ID inválido");
	res.json(await avaliadoresService.deleteAvaliador(id));
}
