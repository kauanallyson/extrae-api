import Elysia from "elysia";
import { PDFParse } from "pdf-parse";
import { z } from "zod";

export const pdfRoutes = new Elysia({ prefix: "/extrair-texto-pdf" }).post(
	"/",
	async ({ body: { pdf } }) => {
		const arrayBuffer = await pdf.arrayBuffer();
		const buffer = Buffer.from(arrayBuffer);

		const parser = new PDFParse({ data: buffer });
		const result = await parser.getText();
		await parser.destroy();

		return { text: result.text };
	},
	{
		body: z.object({
			pdf: z
				.instanceof(File)
				.refine((file) => file.type === "application/pdf", {
					message: "O arquivo deve ser um pdf",
				}),
		}),
	},
);
