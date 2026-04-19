import Elysia from "elysia";
import openapi from "@elysiajs/openapi";
import { pdfRoutes } from "./routes/pdf";
import { laudoRoutes } from "./routes/laudo";
import { profissionaisRoutes } from "./routes/profissionais";
import { excelRoutes } from "./routes/excel";
import { env } from "@/env";

const app = new Elysia()
	.use(openapi())
	.use(pdfRoutes)
	.use(laudoRoutes)
	.use(profissionaisRoutes)
	.use(excelRoutes)
	.listen(env.PORT);

console.log(
	`🦊 Elysia is running at http://${app.server?.hostname}:${app.server?.port}`,
);
