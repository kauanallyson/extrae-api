import { Elysia } from "elysia";
import { pdfRoutes } from "./routes/pdf";
import { laudoRoutes } from "./routes/laudo";

const app = new Elysia()
	.use(pdfRoutes)
	.use(laudoRoutes)
	.listen(3000);

console.log(
	`🦊 Elysia is running at http://${app.server?.hostname}:${app.server?.port}`,
);
