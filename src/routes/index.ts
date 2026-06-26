import { Router } from "express";
import { amostrasRouter } from "./amostras.routes";
import { avaliadoresRouter } from "./avaliadores.routes";

export const router = Router();

router.use("/amostras", amostrasRouter);
router.use("/avaliadores", avaliadoresRouter);
