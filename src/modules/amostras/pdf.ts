import { status } from "elysia";
import { pdf } from "pdf-to-img";

const PDF_MAGIC = Buffer.from([0x25, 0x50, 0x44, 0x46]);

/** Valida o arquivo e renderiza cada pagina do pdf como imagem. */
export async function pdfPagesToImages(file: File): Promise<Buffer[]> {
	if (file.type !== "application/pdf") {
		throw status(400, { message: "O arquivo deve ser um pdf" });
	}

	const buffer = Buffer.from(await file.arrayBuffer());
	if (!buffer.subarray(0, 4).equals(PDF_MAGIC)) {
		throw status(400, { message: "O arquivo deve ser um pdf válido" });
	}

	const doc = await pdf(buffer, { scale: 2.5 });
	const pages: Buffer[] = [];
	for await (const page of doc) {
		pages.push(page);
	}
	return pages;
}
