import { Router } from "express";
import { amostrasAiRouter } from "./amostras-ai";
import { amostrasPlanilhaRouter } from "./amostras-planilha";
import { amostrasRaeRouter } from "./amostras-rae";
import { amostrasRouter } from "./amostras";
import { avaliadoresRouter } from "./avaliadores";

export const router = Router();

router.use("/amostras", amostrasPlanilhaRouter);
router.use("/amostras/ia", amostrasAiRouter);
router.use("/amostras", amostrasRaeRouter);
router.use("/amostras", amostrasRouter);
router.use("/avaliadores", avaliadoresRouter);
