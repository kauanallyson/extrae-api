import { Router } from "express";
import { downloadPlanilha } from "@/controllers/amostrasPlanilhaController";

export const amostrasPlanilhaRouter = Router();

amostrasPlanilhaRouter.get("/planilha", downloadPlanilha);
