import { Elysia } from "elysia";
import { amostrasRoutes } from "./amostras";
import { amostrasAiRoutes } from "./amostras-ai";
import { amostrasRaeRoutes } from "./amostras-rae";
import { avaliadoresRoutes } from "./avaliadores";
import { pdfRoutes } from "./pdf";

export const routes = new Elysia()
	.use(amostrasRoutes)
	.use(amostrasAiRoutes)
	.use(amostrasRaeRoutes)
	.use(avaliadoresRoutes)
	.use(pdfRoutes);
