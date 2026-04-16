import Elysia from "elysia";
import { z } from "zod";
import { PDFParse } from "pdf-parse";

const pdfSchema = z.object({
	pdf: z.instanceof(File).refine((file) => file.type === "application/pdf", {
		message: "O arquivo deve ser um pdf",
	}),
});

export const pdfRoutes = new Elysia({ prefix: "/extrair-pdf" }).post(
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
		body: pdfSchema,
	},
);
