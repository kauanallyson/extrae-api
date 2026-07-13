import { Elysia } from "elysia";
import { idParamsSchema } from "@/utils/typebox";
import { AvaliadoresModel } from "./model";
import { Avaliadores } from "./service";

export const avaliadores = new Elysia({ prefix: "/avaliadores" })
	.get("/", () => Avaliadores.list())
	.get("/:id", ({ params: { id } }) => Avaliadores.getById(id), {
		params: idParamsSchema,
	})
	.post(
		"/",
		async ({ body, status }) => status(201, await Avaliadores.create(body)),
		{ body: AvaliadoresModel.insert },
	)
	.put("/:id", ({ params: { id }, body }) => Avaliadores.update(id, body), {
		params: idParamsSchema,
		body: AvaliadoresModel.update,
	})
	.delete("/:id", ({ params: { id } }) => Avaliadores.remove(id), {
		params: idParamsSchema,
	});
