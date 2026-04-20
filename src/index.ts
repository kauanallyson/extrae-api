import openapi from "@elysiajs/openapi";
import { Elysia } from "elysia";
import { env } from "@/env";
import { excelRoutes } from "./routes/excel";
import { laudoRoutes } from "./routes/laudo";
import { pdfRoutes } from "./routes/pdf";
import { profissionaisRoutes } from "./routes/profissionais";

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
