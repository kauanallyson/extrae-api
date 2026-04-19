import { betterAuthPlugin } from "@/middleware/better-auth";
import Elysia from "elysia";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import { z } from "zod";

async function extractTextFromPDF(buffer: Buffer): Promise<string> {
	const doc = await pdfjsLib.getDocument({
		data: new Uint8Array(buffer),
		useWorkerFetch: false,
		isEvalSupported: false,
	}).promise;

	const lines: string[] = [];

	for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
		const page = await doc.getPage(pageNum);
		const content = await page.getTextContent();

		// Agrupa itens de texto por posição Y (mesma linha = Y próximo)
		const rowMap = new Map<number, { text: string; x: number }[]>();

		for (const item of content.items) {
			if (!("str" in item) || !item.str.trim()) continue;

			const y = Math.round(item.transform[5]);
			const x = item.transform[4];

			// Tolera variação de 2px para considerar mesma linha
			const delta = 2;
			const existingKey = [...rowMap.keys()].find(
				(k) => Math.abs(k - y) <= delta,
			);
			const key = existingKey ?? y;

			if (!rowMap.has(key)) rowMap.set(key, []);
			rowMap.get(key)?.push({ text: item.str, x });
		}

		// Ordena linhas de cima para baixo, células da esquerda para direita
		const sortedRows = [...rowMap.entries()]
			.sort(([a], [b]) => b - a)
			.map(([, cells]) =>
				cells
					.sort((a, b) => a.x - b.x)
					.map((c) => c.text)
					.join("\t"),
			);

		lines.push(`--- Página ${pageNum} ---`);
		lines.push(...sortedRows);
	}

	return lines.join("\n");
}

export const pdfRoutes = new Elysia({ prefix: "/extrair-texto-pdf" })
	.use(betterAuthPlugin)
	.post(
		"/",
		async ({ body: { pdf } }) => {
			const arrayBuffer = await pdf.arrayBuffer();
			const buffer = Buffer.from(arrayBuffer);
			const laudoText = await extractTextFromPDF(buffer);
			return { laudoText };
		},
		{
			auth: true,
			body: z.object({
				pdf: z
					.instanceof(File)
					.refine((file) => file.type === "application/pdf", {
						message: "O arquivo deve ser um pdf",
					}),
			}),
		},
	);
