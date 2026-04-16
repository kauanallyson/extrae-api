import { Elysia } from "elysia";
import { pdfRoutes } from "./routes/pdf";
import { userRoutes } from "./routes/users";

const app = new Elysia().use(pdfRoutes).use(userRoutes).listen(3000);

console.log(
	`🦊 Elysia is running at http://${app.server?.hostname}:${app.server?.port}`,
);
