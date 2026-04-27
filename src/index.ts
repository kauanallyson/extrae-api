import { cors } from "@elysiajs/cors";
import openapi from "@elysiajs/openapi";
import { Elysia } from "elysia";
import { routes } from "./routes";

const app = new Elysia()
	.use(
		cors({
			origin: "https://extrae.vercel.app",
			exposeHeaders: ["Content-Disposition"],
		}),
	)
	.use(openapi())
	.get("/health", () => ({ status: "ok" }))
	.use(routes)
	.listen({ hostname: "0.0.0.0", port: 3000 });

console.log(
	`🦊 Elysia is running at http://${app.server?.hostname}:${app.server?.port}`,
);
