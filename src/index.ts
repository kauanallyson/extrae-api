import { cors } from "@elysiajs/cors";
import openapi from "@elysiajs/openapi";
import { Elysia } from "elysia";
import { amostrasRoutes } from "./routes/amostras";
import { avaliadoresRoutes } from "./routes/avaliadores";
import { pdfRoutes } from "./routes/extrair-texto-pdf";
import { amostraRoutes } from "./routes/gerar-amostra-ia";
import { excelRoutes } from "./routes/gerar-excel-rae";

const app = new Elysia()
	.use(cors({ origin: "https://extrae.vercel.app" }))
	.use(openapi())
	.get("/health", () => ({ status: "ok" }))
	.use(pdfRoutes)
	.use(amostraRoutes)
	.use(amostrasRoutes)
	.use(avaliadoresRoutes)
	.use(excelRoutes)
	.listen({ hostname: "0.0.0.0", port: 3000 });

console.log(
	`🦊 Elysia is running at http://${app.server?.hostname}:${app.server?.port}`,
);
