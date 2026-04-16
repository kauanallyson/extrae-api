import { fromTypes, openapi } from "@elysiajs/openapi";
import { Elysia } from "elysia";
import { userRoutes } from "./routes/users";

const app = new Elysia()
	.use(openapi({ references: fromTypes() }))
	.use(userRoutes)
	.listen(3000);

console.log(
	`🦊 Elysia is running at http://${app.server?.hostname}:${app.server?.port}`,
);
