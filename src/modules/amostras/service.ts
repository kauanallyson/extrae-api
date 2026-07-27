import { Value } from "@sinclair/typebox/value";
import { desc, eq, getTableColumns } from "drizzle-orm";
import { status } from "elysia";
import { db } from "@/config/db";
import { openai } from "@/config/openai";
import { SYSTEM_PROMPT } from "@/config/prompt";
import { avaliadores } from "@/modules/avaliadores/model";
import { Avaliadores } from "@/modules/avaliadores/service";
import { normalizeContato } from "@/utils/normalize";
import { sanitizeAsciiWord } from "@/utils/strings";
import { splitPercentuais, toSelect, withPercentuais } from "./mappers";
import type { SelectAmostra } from "./model";
import {
	type AmostrasModel,
	acumuladosPropostos,
	amostras,
	incidencias,
	AmostrasModel as Model,
} from "./model";
import { pdfPagesToImages } from "./pdf";
import {
	buildPlanilhaWorkbook,
	buildRaeWorkbook,
	type PlanilhaTipo,
	raeEntries,
} from "./planilha";
import { type ValorUnitarioStats, valorUnitarioStats } from "./stats";

function notFound(id: number): never {
	throw status(404, { message: `Amostra ${id} nao encontrada.` });
}

async function ensureAvaliadorExiste(avaliadorId: number): Promise<void> {
	if (!(await Avaliadores.exists(avaliadorId))) {
		throw status(400, { message: "O avaliador informado nao existe." });
	}
}

export abstract class Amostras {
	static async list(query: AmostrasModel["listQuery"]): Promise<{
		data: AmostrasModel["select"][];
		nextCursor: number | null;
	}> {
		const rows = await db.query.amostras.findMany({
			where: (amostras, { and, eq, lt }) =>
				and(
					query.cursor !== undefined
						? lt(amostras.id, query.cursor)
						: undefined,
					query.municipio !== undefined
						? eq(amostras.municipio, query.municipio)
						: undefined,
				),
			orderBy: (amostras, { desc }) => desc(amostras.id),
			limit: query.limit + 1,
			with: withPercentuais,
		});

		const page = rows.slice(0, query.limit);
		const nextCursor =
			rows.length > query.limit ? (page.at(-1)?.id ?? null) : null;

		return { data: page.map(toSelect), nextCursor };
	}

	static async getById(id: number): Promise<AmostrasModel["select"]> {
		const row = await db.query.amostras.findFirst({
			where: (amostras, { eq }) => eq(amostras.id, id),
			with: withPercentuais,
		});

		if (!row) notFound(id);
		return toSelect(row);
	}

	static async create(
		data: AmostrasModel["insert"],
	): Promise<AmostrasModel["select"]> {
		await ensureAvaliadorExiste(data.avaliadorId);

		const {
			amostra,
			incidencias: incidenciasValues,
			acumuladoProposto: acumuladoValues,
		} = splitPercentuais(data);

		const row = await db.transaction(async (tx) => {
			const [created] = await tx
				.insert(amostras)
				.values(normalizeContato(amostra))
				.returning();
			if (!created) {
				throw status(500, { message: "Ocorreu um erro ao salvar a amostra." });
			}

			if (incidenciasValues?.length) {
				await tx.insert(incidencias).values(
					incidenciasValues.map((percentual, index) => ({
						amostraId: created.id,
						ordem: index + 1,
						percentual,
					})),
				);
			}
			if (acumuladoValues?.length) {
				await tx.insert(acumuladosPropostos).values(
					acumuladoValues.map((percentual, index) => ({
						amostraId: created.id,
						ordem: index + 1,
						percentual,
					})),
				);
			}

			return created;
		});

		return {
			...row,
			incidencias: incidenciasValues ?? [],
			acumuladoProposto: acumuladoValues ?? [],
		};
	}

	static async update(
		id: number,
		data: AmostrasModel["update"],
	): Promise<AmostrasModel["select"]> {
		if (data.avaliadorId !== undefined) {
			await ensureAvaliadorExiste(data.avaliadorId);
		}

		const {
			amostra,
			incidencias: incidenciasValues,
			acumuladoProposto: acumuladoValues,
		} = splitPercentuais(data);

		const row = await db.transaction(async (tx) => {
			let updated: SelectAmostra | undefined;
			if (Object.keys(amostra).length > 0) {
				[updated] = await tx
					.update(amostras)
					.set(normalizeContato(amostra))
					.where(eq(amostras.id, id))
					.returning();
			} else {
				[updated] = await tx
					.select()
					.from(amostras)
					.where(eq(amostras.id, id))
					.limit(1);
			}
			if (!updated) notFound(id);

			if (incidenciasValues !== undefined) {
				await tx.delete(incidencias).where(eq(incidencias.amostraId, id));
				if (incidenciasValues?.length) {
					await tx.insert(incidencias).values(
						incidenciasValues.map((percentual, index) => ({
							amostraId: id,
							ordem: index + 1,
							percentual,
						})),
					);
				}
			}
			if (acumuladoValues !== undefined) {
				await tx
					.delete(acumuladosPropostos)
					.where(eq(acumuladosPropostos.amostraId, id));
				if (acumuladoValues?.length) {
					await tx.insert(acumuladosPropostos).values(
						acumuladoValues.map((percentual, index) => ({
							amostraId: id,
							ordem: index + 1,
							percentual,
						})),
					);
				}
			}

			return updated;
		});

		const withRelations = await db.query.amostras.findFirst({
			where: (amostras, { eq }) => eq(amostras.id, row.id),
			with: withPercentuais,
		});
		if (!withRelations) notFound(id);
		return toSelect(withRelations);
	}

	static async remove(id: number): Promise<AmostrasModel["select"]> {
		const row = await db.query.amostras.findFirst({
			where: (amostras, { eq }) => eq(amostras.id, id),
			with: withPercentuais,
		});
		if (!row) notFound(id);

		await db.delete(amostras).where(eq(amostras.id, id));
		return toSelect(row);
	}

	static async extractFromPdf(file: File): Promise<AmostrasModel["extracted"]> {
		const pageImages = await pdfPagesToImages(file);

		const response = await openai.chat.completions.create({
			model: "gpt-4o",
			temperature: 0,
			messages: [
				{ role: "system", content: SYSTEM_PROMPT },
				{
					role: "user",
					content: pageImages.map((page) => ({
						type: "image_url" as const,
						image_url: {
							url: `data:image/png;base64,${page.toString("base64")}`,
							detail: "high" as const,
						},
					})),
				},
			],
			response_format: {
				type: "json_schema",
				json_schema: {
					name: "amostra_extraido",
					strict: true,
					schema: {
						...JSON.parse(JSON.stringify(Model.extracted)),
						additionalProperties: false,
					},
				},
			},
		});

		const choice = response.choices?.[0];
		if (!choice) {
			throw status(500, { message: "Erro na OpenAI" });
		}

		const message = choice.message;

		if (message.refusal) {
			throw status(400, { message: message.refusal });
		}

		let parsed: unknown;
		try {
			parsed = JSON.parse(message.content ?? "");
		} catch {
			throw status(500, { message: "Erro na OpenAI" });
		}
		if (!Value.Check(Model.extracted, parsed)) {
			throw status(500, { message: "Erro na OpenAI" });
		}

		return normalizeContato(parsed);
	}

	static async generatePlanilha(tipo: PlanilhaTipo = "imovel"): Promise<{
		buffer: Buffer;
		filename: string;
	}> {
		const rows = await db
			.select({
				...getTableColumns(amostras),
				avaliador: avaliadores.nome,
			})
			.from(amostras)
			.leftJoin(avaliadores, eq(amostras.avaliadorId, avaliadores.id))
			.orderBy(desc(amostras.createdAt));

		return buildPlanilhaWorkbook(tipo, rows as Record<string, unknown>[]);
	}

	static async generateRae(id: number): Promise<{
		buffer: Buffer;
		filename: string;
	}> {
		const amostra = await db.query.amostras.findFirst({
			where: (amostras, { eq }) => eq(amostras.id, id),
			with: { ...withPercentuais, avaliador: true },
		});

		if (!amostra) {
			throw status(404, { message: `Amostra com id: ${id} não encontrada` });
		}

		const buffer = await buildRaeWorkbook(raeEntries(amostra));

		const rawFirst = amostra.proponente?.trim().split(" ")[0] ?? "";
		const safeFirst = sanitizeAsciiWord(rawFirst) || "cliente";

		return { buffer, filename: `dados-rae-${safeFirst}.xlsx` };
	}

	static async getStats(municipio?: string): Promise<ValorUnitarioStats> {
		return valorUnitarioStats(municipio);
	}
}
