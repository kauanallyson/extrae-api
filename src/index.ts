import { cors } from "@elysiajs/cors";
import { openapi } from "@elysiajs/openapi";
import { Elysia } from "elysia";
import { env } from "@/config/env";
import { amostras } from "@/modules/amostras";
import { auth } from "@/modules/auth";
import { avaliadores } from "@/modules/avaliadores";
import { firstIssueMessage } from "@/utils/typebox";

export const app = new Elysia()
	.use(
		cors({
			origin: "https://extrae.vercel.app",
			exposeHeaders: ["Content-Disposition"],
		}),
	)
	.use(openapi())
	.onError(({ code, error, set }) => {
		if (code === "VALIDATION") {
			set.status = 400;
			return { message: firstIssueMessage(error) };
		}
		if (code === "PARSE") {
			set.status = 400;
			return { message: "Corpo da requisição inválido" };
		}
		if (code === "NOT_FOUND") {
			set.status = 404;
			return { message: "Rota não encontrada" };
		}
		if (code === "UNKNOWN" || code === "INTERNAL_SERVER_ERROR") {
			console.error(error);
			set.status = 500;
			return { message: "Erro interno do servidor" };
		}
	})
	.get("/health", () => ({ status: "ok" }))
	.use(auth)
	.use(amostras)
	.use(avaliadores);

export type App = typeof app;

if (import.meta.main) {
	app.listen({ hostname: "0.0.0.0", port: env.PORT });
	console.log(`🦊 Elysia is running at http://0.0.0.0:${env.PORT}`);
}
