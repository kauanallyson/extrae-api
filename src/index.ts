import { Elysia } from "elysia";
import { pdfRoutes } from "./routes/pdf";
import { laudoRoutes } from "./routes/laudo";
import { profissionaisRoutes } from "./routes/profissionais";

const app = new Elysia()
	.use(pdfRoutes)
	.use(laudoRoutes)
	.use(profissionaisRoutes)
	.listen(3000);

console.log(
	`🦊 Elysia is running at http://${app.server?.hostname}:${app.server?.port}`,
);
