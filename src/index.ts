import { cors } from "@elysiajs/cors";
import openapi from "@elysiajs/openapi";
import { Elysia } from "elysia";
import { amostrasRoutes } from "./routes/amostras";
import { amostrasAiRoutes } from "./routes/amostras-ai";
import { amostrasRaeRoutes } from "./routes/amostras-rae";
import { avaliadoresRoutes } from "./routes/avaliadores";
import { pdfRoutes } from "./routes/pdf";

const app = new Elysia()
	.use(
		cors({
			origin: "https://extrae.vercel.app",
			exposeHeaders: ["Content-Disposition"],
		}),
	)
	.use(openapi())
	.get("/health", () => ({ status: "ok" }))
	.use(amostrasRoutes)
	.use(amostrasAiRoutes)
	.use(amostrasRaeRoutes)
	.use(avaliadoresRoutes)
	.use(pdfRoutes)
	.listen({ hostname: "0.0.0.0", port: 3000 });

console.log(
	`🦊 Elysia is running at http://${app.server?.hostname}:${app.server?.port}`,
);
