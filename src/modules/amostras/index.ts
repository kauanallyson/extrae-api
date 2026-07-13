import { Elysia } from "elysia";
import { idParamsSchema } from "@/utils/schemas";
import { AmostrasModel } from "./model";
import { Amostras } from "./service";

const SPREADSHEET_CONTENT_TYPE =
	"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export const amostras = new Elysia({ prefix: "/amostras" })
	.get(
		"/planilha",
		async ({ query, set }) => {
			const { buffer, filename } = await Amostras.generatePlanilha(query);

			set.headers["content-type"] = SPREADSHEET_CONTENT_TYPE;
			set.headers["content-disposition"] = `attachment; filename="${filename}"`;
			return buffer;
		},
		{ query: AmostrasModel.planilhaQuery },
	)
	.post("/ia", ({ body }) => Amostras.extractFromPdf(body.pdf), {
		body: AmostrasModel.pdf,
	})
	.get(
		"/:id/rae",
		async ({ params: { id }, set }) => {
			const { buffer, filename } = await Amostras.generateRae(id);

			set.headers["content-type"] = SPREADSHEET_CONTENT_TYPE;
			set.headers["content-disposition"] = `attachment; filename="${filename}"`;
			return buffer;
		},
		{ params: idParamsSchema },
	)
	.get("/", ({ query }) => Amostras.list(query), {
		query: AmostrasModel.filter,
	})
	.get(
		"/:id/similares",
		({ params: { id }, query }) => Amostras.findSimilares(id, query),
		{ params: idParamsSchema, query: AmostrasModel.similaresQuery },
	)
	.post(
		"/similares",
		({ body, query }) => Amostras.findSimilaresPorCriterios(body, query),
		{ body: AmostrasModel.similaresAlvo, query: AmostrasModel.similaresQuery },
	)
	.get("/:id", ({ params: { id } }) => Amostras.getById(id), {
		params: idParamsSchema,
	})
	.post(
		"/",
		async ({ body, status }) => status(201, await Amostras.create(body)),
		{
			body: AmostrasModel.insert,
		},
	)
	.put("/:id", ({ params: { id }, body }) => Amostras.update(id, body), {
		params: idParamsSchema,
		body: AmostrasModel.update,
	})
	.delete("/:id", ({ params: { id } }) => Amostras.remove(id), {
		params: idParamsSchema,
	});
