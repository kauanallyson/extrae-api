import { Router } from "express";
import {
	createAvaliador,
	deleteAvaliador,
	getAvaliadorById,
	getAvaliadores,
	updateAvaliador,
} from "@/controllers/avaliadores.controller";

export const avaliadoresRouter = Router();

avaliadoresRouter.get("/", getAvaliadores);
avaliadoresRouter.get("/:id", getAvaliadorById);
avaliadoresRouter.post("/", createAvaliador);
avaliadoresRouter.put("/:id", updateAvaliador);
avaliadoresRouter.delete("/:id", deleteAvaliador);
