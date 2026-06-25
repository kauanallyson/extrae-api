import { Router } from "express";
import { downloadRae } from "@/controllers/amostrasRaeController";

export const amostrasRaeRouter = Router();

amostrasRaeRouter.get("/:id/rae", downloadRae);
