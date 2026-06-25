import { Router } from "express";
import {
  createAmostra,
  deleteAmostra,
  getAmostraById,
  getAmostras,
  updateAmostra,
} from "@/controllers/amostrasController";

export const amostrasRouter = Router();

amostrasRouter.get("/", getAmostras);
amostrasRouter.get("/:id", getAmostraById);
amostrasRouter.post("/", createAmostra);
amostrasRouter.put("/:id", updateAmostra);
amostrasRouter.delete("/:id", deleteAmostra);
