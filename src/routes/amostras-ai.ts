import { Router } from "express";
import multer from "multer";
import { extractAmostraFromPdf } from "@/controllers/amostrasAiController";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

export const amostrasAiRouter = Router();

amostrasAiRouter.post("/", upload.single("pdf"), extractAmostraFromPdf);
