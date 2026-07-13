import { cors } from "@elysiajs/cors";
import { openapi } from "@elysiajs/openapi";
import { Elysia } from "elysia";
import { env } from "@/config/env";
import { amostras } from "@/modules/amostras";
import { avaliadores } from "@/modules/avaliadores";

function firstIssueMessage(error: unknown): string {
	const all = (
		error as {
			all?: Array<{ path?: unknown; message?: string }>;
		}
	).all;
	const issue = all?.[0];
	if (!issue?.message) return "Dados inválidos";

	const path = Array.isArray(issue.path)
		? issue.path
				.map((segment: unknown) =>
					typeof segment === "object" && segment !== null && "key" in segment
						? (segment as { key: unknown }).key
						: segment,
				)
				.join(".")
		: typeof issue.path === "string"
			? issue.path.replace(/^\//, "").replaceAll("/", ".")
			: "";

	return path && path !== "root" ? `${path}: ${issue.message}` : issue.message;
}

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
		// thrown status(...) responses fall through to Elysia's default handling
	})
	.get("/health", () => ({ status: "ok" }))
	.use(amostras)
	.use(avaliadores);

export type App = typeof app;

if (import.meta.main) {
	app.listen({ hostname: "0.0.0.0", port: env.PORT });
	console.log(`🦊 Elysia is running at http://0.0.0.0:${env.PORT}`);
}
