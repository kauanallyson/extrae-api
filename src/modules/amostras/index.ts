import { Elysia } from "elysia";
import { idParamsSchema } from "@/utils/typebox";
import { SPREADSHEET_CONTENT_TYPE } from "@/utils/xlsx";
import { AmostrasModel } from "./model";
import { Amostras } from "./service";

export const amostras = new Elysia({ prefix: "/amostras" })
	.get("/planilha", async ({ set }) => {
		const { buffer, filename } = await Amostras.generatePlanilha();

		set.headers["Content-Type"] = SPREADSHEET_CONTENT_TYPE;
		set.headers["Content-Disposition"] = `attachment; filename="${filename}"`;
		return buffer;
	})
	.post("/ia", ({ body }) => Amostras.extractFromPdf(body.pdf), {
		body: AmostrasModel.pdf,
	})
	.get("/", ({ query }) => Amostras.list(query), {
		query: AmostrasModel.listQuery,
	})
	.get("/:id", ({ params: { id } }) => Amostras.getById(id), {
		params: idParamsSchema,
	})
	.get(
		"/:id/rae",
		async ({ params: { id }, set }) => {
			const { buffer, filename } = await Amostras.generateRae(id);

			set.headers["Content-Type"] = SPREADSHEET_CONTENT_TYPE;
			set.headers["Content-Disposition"] = `attachment; filename="${filename}"`;
			set.headers["Content-Length"] = buffer.byteLength.toString();
			return buffer;
		},
		{ params: idParamsSchema },
	)
	.post(
		"/",
		async ({ body, status }) => status(201, await Amostras.create(body)),
		{ body: AmostrasModel.insert },
	)
	.put("/:id", ({ params: { id }, body }) => Amostras.update(id, body), {
		params: idParamsSchema,
		body: AmostrasModel.update,
	})
	.delete("/:id", ({ params: { id } }) => Amostras.remove(id), {
		params: idParamsSchema,
	});
