import { Router } from "express";
import multer from "multer";
import {
	createAmostra,
	deleteAmostra,
	getAmostraById,
	getAmostras,
	updateAmostra,
} from "@/controllers/amostras.controller";
import { extractAmostraFromPdf } from "@/controllers/amostras-ai.controller";
import { downloadPlanilha } from "@/controllers/amostras-planilha.controller";
import { downloadRae } from "@/controllers/amostras-rae.controller";

const upload = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: 10 * 1024 * 1024 },
});

export const amostrasRouter = Router();

amostrasRouter.get("/planilha", downloadPlanilha);
amostrasRouter.post("/ia", upload.single("pdf"), extractAmostraFromPdf);
amostrasRouter.get("/:id/rae", downloadRae);

amostrasRouter.get("/", getAmostras);
amostrasRouter.get("/:id", getAmostraById);
amostrasRouter.post("/", createAmostra);
amostrasRouter.put("/:id", updateAmostra);
amostrasRouter.delete("/:id", deleteAmostra);
