import { Value } from "@sinclair/typebox/value";
import { asc, desc, eq, getTableColumns, inArray, lt } from "drizzle-orm";
import { status } from "elysia";
import ExcelJS from "exceljs";
import { db } from "@/config/db";
import { openai } from "@/config/openai";
import { SYSTEM_PROMPT } from "@/config/prompt";
import { avaliadores } from "@/modules/avaliadores/model";
import { Avaliadores } from "@/modules/avaliadores/service";
import {
	formatCnpj,
	formatCpf,
	normalizeCep,
	sanitizeAsciiWord,
	stripNonDigits,
} from "@/utils/strings";
import { cellValue } from "@/utils/xlsx";
import type { SelectAmostra } from "./model";
import {
	type AmostrasModel,
	acumuladosPropostos,
	amostras,
	incidencias,
	AmostrasModel as Model,
} from "./model";

function notFound(id: number): never {
	throw status(404, { message: `Amostra ${id} nao encontrada.` });
}

async function ensureAvaliadorExiste(avaliadorId: number): Promise<void> {
	if (!(await Avaliadores.exists(avaliadorId))) {
		throw status(400, { message: "O avaliador informado nao existe." });
	}
}

function normalizeContato<
	T extends {
		cpf?: string | null;
		cnpj?: string | null;
		cep?: string | null;
		telefone?: string | null;
	},
>(data: T): T {
	return {
		...data,
		cpf: formatCpf(data.cpf),
		cnpj: formatCnpj(data.cnpj),
		cep: normalizeCep(data.cep),
		telefone: stripNonDigits(data.telefone),
	} as T;
}

interface Percentuais {
	incidencias: number[];
	acumuladoProposto: number[];
}

function splitPercentuais<
	T extends {
		incidencias?: number[] | null;
		acumuladoProposto?: number[] | null;
	},
>(
	data: T,
): {
	scalars: Omit<T, "incidencias" | "acumuladoProposto">;
	incidencias: number[] | null | undefined;
	acumuladoProposto: number[] | null | undefined;
} {
	const {
		incidencias: incidenciasValues,
		acumuladoProposto: acumuladoValues,
		...scalars
	} = data;
	return {
		scalars,
		incidencias: incidenciasValues,
		acumuladoProposto: acumuladoValues,
	};
}

async function carregarPercentuais(
	ids: number[],
): Promise<Map<number, Percentuais>> {
	const porAmostra = new Map<number, Percentuais>(
		ids.map((id) => [id, { incidencias: [], acumuladoProposto: [] }]),
	);
	if (ids.length === 0) return porAmostra;

	const [incidenciasRows, acumuladoRows] = await Promise.all([
		db
			.select()
			.from(incidencias)
			.where(inArray(incidencias.amostraId, ids))
			.orderBy(asc(incidencias.amostraId), asc(incidencias.ordem)),
		db
			.select()
			.from(acumuladosPropostos)
			.where(inArray(acumuladosPropostos.amostraId, ids))
			.orderBy(
				asc(acumuladosPropostos.amostraId),
				asc(acumuladosPropostos.ordem),
			),
	]);

	for (const row of incidenciasRows) {
		porAmostra.get(row.amostraId)?.incidencias.push(row.percentual);
	}
	for (const row of acumuladoRows) {
		porAmostra.get(row.amostraId)?.acumuladoProposto.push(row.percentual);
	}
	return porAmostra;
}

function comPercentuais(
	amostra: SelectAmostra,
	percentuais: Percentuais | undefined,
): AmostrasModel["select"] {
	return {
		...amostra,
		incidencias: percentuais?.incidencias ?? [],
		acumuladoProposto: percentuais?.acumuladoProposto ?? [],
	};
}

const PDF_MAGIC = Buffer.from([0x25, 0x50, 0x44, 0x46]);

const FIELD_RESOLVERS: Record<
	string,
	(row: Record<string, unknown>) => unknown
> = {
	telefone: (row) => {
		const ddd = row.ddd ? String(row.ddd) : "";
		const telefone = row.telefone ? String(row.telefone) : "";
		if (!telefone) return "";
		return ddd ? `(${ddd}) ${telefone}` : telefone;
	},
};

const PLANILHA_FIELDS = [
	"avaliador",
	"proponente",
	"telefone",
	"endereco",
	"bairro",
	"municipio",
	"uf",
	"cep",
	"coordenadaS",
	"coordenadaW",
	"valorTerreno",
	"valorImovel",
	"valorUnitario",
	"areaTerreno",
	"areaConstruida",
	"testada",
	"quartos",
	"banheiros",
	"suites",
	"vagas",
	"padraoAcabamento",
	"estadoConservacao",
	"idadeEstimada",
	"infraestrutura",
	"servicosPublicos",
	"usosPredominantes",
	"viaAcesso",
	"regiaoContexto",
] as const;

const RAE_EXCLUDED_FIELDS = new Set([
	"id",
	"avaliadorId",
	"createdAt",
	"updatedAt",
]);

export abstract class Amostras {
	static async list(query: AmostrasModel["listQuery"]): Promise<{
		data: AmostrasModel["select"][];
		nextCursor: number | null;
	}> {
		const rows = await db
			.select()
			.from(amostras)
			.where(
				query.cursor !== undefined ? lt(amostras.id, query.cursor) : undefined,
			)
			.orderBy(desc(amostras.id))
			.limit(query.limit + 1);

		const page = rows.slice(0, query.limit);
		const nextCursor =
			rows.length > query.limit ? (page.at(-1)?.id ?? null) : null;

		const percentuais = await carregarPercentuais(page.map((row) => row.id));
		return {
			data: page.map((row) => comPercentuais(row, percentuais.get(row.id))),
			nextCursor,
		};
	}

	static async getById(id: number): Promise<AmostrasModel["select"]> {
		const [row] = await db
			.select()
			.from(amostras)
			.where(eq(amostras.id, id))
			.limit(1);

		if (!row) notFound(id);

		const percentuais = await carregarPercentuais([id]);
		return comPercentuais(row, percentuais.get(id));
	}

	static async create(
		data: AmostrasModel["insert"],
	): Promise<AmostrasModel["select"]> {
		await ensureAvaliadorExiste(data.avaliadorId);

		const {
			scalars,
			incidencias: incidenciasValues,
			acumuladoProposto: acumuladoValues,
		} = splitPercentuais(data);

		const row = await db.transaction(async (tx) => {
			const [created] = await tx
				.insert(amostras)
				.values(normalizeContato(scalars))
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
			scalars,
			incidencias: incidenciasValues,
			acumuladoProposto: acumuladoValues,
		} = splitPercentuais(data);

		const row = await db.transaction(async (tx) => {
			let updated: SelectAmostra | undefined;
			if (Object.keys(scalars).length > 0) {
				[updated] = await tx
					.update(amostras)
					.set(normalizeContato(scalars))
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

		const percentuais = await carregarPercentuais([id]);
		return comPercentuais(row, percentuais.get(id));
	}

	static async remove(id: number): Promise<AmostrasModel["select"]> {
		const percentuais = await carregarPercentuais([id]);

		const [row] = await db
			.delete(amostras)
			.where(eq(amostras.id, id))
			.returning();

		if (!row) notFound(id);
		return comPercentuais(row, percentuais.get(id));
	}

	static async extractFromPdf(file: File): Promise<AmostrasModel["extracted"]> {
		if (file.type !== "application/pdf") {
			throw status(400, { message: "O arquivo deve ser um pdf" });
		}

		const buffer = Buffer.from(await file.arrayBuffer());
		if (!buffer.subarray(0, 4).equals(PDF_MAGIC)) {
			throw status(400, { message: "O arquivo deve ser um pdf válido" });
		}

		const base64 = buffer.toString("base64");

		const response = await openai.chat.completions.create({
			model: "gpt-4o",
			temperature: 0,
			messages: [
				{ role: "system", content: SYSTEM_PROMPT },
				{
					role: "user",
					content: [
						{
							type: "file",
							file: {
								filename: file.name || "document.pdf",
								file_data: `data:application/pdf;base64,${base64}`,
							},
						},
					],
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

	static async generatePlanilha(): Promise<{
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

		const workbook = new ExcelJS.Workbook();
		const sheet = workbook.addWorksheet("Amostras");

		sheet.columns = PLANILHA_FIELDS.map((field) => ({
			header: field,
			key: field,
			width: 25,
		}));
		sheet.getRow(1).font = { bold: true, size: 12 };

		for (const row of rows) {
			const record = row as Record<string, unknown>;
			sheet.addRow(
				PLANILHA_FIELDS.map((field) => {
					const resolver = FIELD_RESOLVERS[field];
					return cellValue(resolver ? resolver(record) : record[field]);
				}),
			);
		}

		const buffer = await workbook.xlsx.writeBuffer();
		return { buffer: Buffer.from(buffer), filename: "amostras.xlsx" };
	}

	static async generateRae(id: number): Promise<{
		buffer: Buffer;
		filename: string;
	}> {
		const [amostra] = await db
			.select()
			.from(amostras)
			.where(eq(amostras.id, id));

		if (!amostra) {
			throw status(404, { message: `Amostra com id: ${id} não encontrada` });
		}

		const [percentuais, [avaliador]] = await Promise.all([
			carregarPercentuais([id]),
			db
				.select()
				.from(avaliadores)
				.where(eq(avaliadores.id, amostra.avaliadorId)),
		]);
		const arrays = percentuais.get(id);

		const entries: [string, unknown][] = [
			...(avaliador
				? Object.entries(avaliador).filter(([key]) => key !== "id")
				: []),
			...Object.entries(amostra).filter(
				([key]) => !RAE_EXCLUDED_FIELDS.has(key),
			),
			["incidencias", arrays?.incidencias ?? []],
			["acumuladoProposto", arrays?.acumuladoProposto ?? []],
		];

		const workbook = new ExcelJS.Workbook();
		const sheet = workbook.addWorksheet("Dados RAE");

		sheet.columns = entries.map(([key]) => ({
			header: key,
			key,
			width: 25,
		}));
		sheet.getRow(1).font = { bold: true, size: 12 };

		entries.forEach(([, value], index) => {
			const values = Array.isArray(value) ? value : [value];
			values.forEach((item, offset) => {
				sheet.getRow(2 + offset).getCell(index + 1).value = cellValue(item);
			});
		});

		const buffer = await workbook.xlsx.writeBuffer();

		const rawFirst = amostra.proponente?.trim().split(" ")[0] ?? "";
		const safeFirst = sanitizeAsciiWord(rawFirst) || "cliente";

		return {
			buffer: Buffer.from(buffer),
			filename: `dados-rae-${safeFirst}.xlsx`,
		};
	}
}
