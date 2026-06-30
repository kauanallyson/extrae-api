import type express from "express";
import { HttpError } from "@/utils/http-error";

export function errorMiddleware(
	err: Error,
	_req: express.Request,
	res: express.Response,
	_next: express.NextFunction,
) {
	if (err instanceof HttpError) {
		return void res.status(err.status).json(err.body);
	}
	console.error(err);
	res.status(500).json({ message: "Erro interno do servidor" });
}
