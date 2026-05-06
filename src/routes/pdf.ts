import { Elysia, t } from "elysia";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

const MAX_PDF_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_PDF_PAGES = 50;
const ROW_TOLERANCE_PX = 2;

class PdfLimitError extends Error {
	constructor(
		message: string,
		readonly statusCode: number,
	) {
		super(message);
	}
}

async function extractTextFromPDF(buffer: Buffer): Promise<string> {
	const doc = await pdfjsLib.getDocument({
		data: new Uint8Array(buffer),
		useWorkerFetch: false,
	}).promise;

	if (doc.numPages > MAX_PDF_PAGES) {
		throw new PdfLimitError(
			`O PDF excede o limite de ${MAX_PDF_PAGES} paginas.`,
			413,
		);
	}

	const lines: string[] = [];

	for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
		const page = await doc.getPage(pageNum);
		const content = await page.getTextContent();
		const rowMap = new Map<number, { text: string; x: number }[]>();

		for (const item of content.items) {
			if (!("str" in item) || !item.str.trim()) continue;

			const y =
				Math.round(item.transform[5] / ROW_TOLERANCE_PX) * ROW_TOLERANCE_PX;
			const x = item.transform[4];

			if (!rowMap.has(y)) rowMap.set(y, []);
			rowMap.get(y)?.push({ text: item.str, x });
		}

		const sortedRows = [...rowMap.entries()]
			.sort(([a], [b]) => b - a)
			.map(([, cells]) =>
				cells
					.sort((a, b) => a.x - b.x)
					.map((cell) => cell.text)
					.join("\t"),
			);

		lines.push(`--- Pagina ${pageNum} ---`);
		lines.push(...sortedRows);
	}

	return lines.join("\n");
}

export const pdfRoutes = new Elysia({ prefix: "/pdf" }).post(
	"/",
	async ({ body: { pdf }, status }) => {
		if (pdf.size > MAX_PDF_BYTES) {
			return status(413, {
				message: `O arquivo excede o limite de ${Math.floor(MAX_PDF_BYTES / (1024 * 1024))}MB.`,
			});
		}

		try {
			const arrayBuffer = await pdf.arrayBuffer();
			const buffer = Buffer.from(arrayBuffer);
			const amostraText = await extractTextFromPDF(buffer);
			return { amostraText };
		} catch (error) {
			if (error instanceof PdfLimitError) {
				return status(error.statusCode, { message: error.message });
			}

			console.error("PDF extraction failed", error);
			return status(400, {
				message: "Nao foi possivel processar o PDF enviado.",
			});
		}
	},
	{
		body: t.Object({
			pdf: t.File({
				type: "application/pdf",
				error: "O arquivo deve ser um pdf",
			}),
		}),
	},
);
