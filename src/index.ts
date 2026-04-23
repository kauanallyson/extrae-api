import { cors } from "@elysiajs/cors";
import openapi from "@elysiajs/openapi";
import { Elysia } from "elysia";
import { pdfRoutes } from "./routes/extrair-texto-pdf";
import { excelRoutes } from "./routes/gerar-excel-rae";
import { laudoRoutes } from "./routes/gerar-laudo-ia";
import { profissionaisRoutes } from "./routes/profissionais";

const app = new Elysia()
	.use(cors({ origin: "https://extrae.vercel.app" }))
	.use(openapi())
	.get("/health", () => ({ status: "ok" }))
	.use(pdfRoutes)
	.use(laudoRoutes)
	.use(profissionaisRoutes)
	.use(excelRoutes)
	.listen({ hostname: "0.0.0.0", port: 3000 });

console.log(
	`🦊 Elysia is running at http://${app.server?.hostname}:${app.server?.port}`,
);
