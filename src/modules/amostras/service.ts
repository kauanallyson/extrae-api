import { Value } from "@sinclair/typebox/value";
import { desc, eq, getTableColumns } from "drizzle-orm";
import { status } from "elysia";
import ExcelJS from "exceljs";
import { pdf } from "pdf-to-img";
import { db } from "@/config/db";
import { openai } from "@/config/openai";
import { SYSTEM_PROMPT } from "@/config/prompt";
import { avaliadores } from "@/modules/avaliadores/model";
import { Avaliadores } from "@/modules/avaliadores/service";
import {
	formatCnpj,
	formatCpf,
	formatDateBr,
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

type AmostrasWith = NonNullable<
	Parameters<typeof db.query.amostras.findFirst>[0]
>["with"];

const withPercentuais = {
	incidencias: { orderBy: (incidencias, { asc }) => asc(incidencias.ordem) },
	acumuladosPropostos: {
		orderBy: (acumuladosPropostos, { asc }) => asc(acumuladosPropostos.ordem),
	},
} satisfies AmostrasWith;

type AmostraComPercentuais = SelectAmostra & {
	incidencias: { percentual: number }[];
	acumuladosPropostos: { percentual: number }[];
};

function toSelect({
	incidencias: incidenciasRows,
	acumuladosPropostos: acumuladoRows,
	...amostra
}: AmostraComPercentuais): AmostrasModel["select"] {
	return {
		...amostra,
		incidencias: incidenciasRows.map((row) => row.percentual),
		acumuladoProposto: acumuladoRows.map((row) => row.percentual),
	};
}

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

const PDF_MAGIC = Buffer.from([0x25, 0x50, 0x44, 0x46]);

const DECIMAL_FIELDS = new Set([
	"valorTerreno",
	"valorImovel",
	"valorUnitario",
	"areaTerreno",
	"areaConstruida",
	"testada",
]);

const DATE_FIELDS = new Set(["dataReferencia"]);

function toDecimal(value: unknown): unknown {
	return typeof value === "number" ? value / 100 : value;
}

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
	valorTerreno: (row) => toDecimal(row.valorTerreno),
	valorImovel: (row) => toDecimal(row.valorImovel),
	valorUnitario: (row) => toDecimal(row.valorUnitario),
	areaTerreno: (row) => toDecimal(row.areaTerreno),
	areaConstruida: (row) => toDecimal(row.areaConstruida),
	testada: (row) => toDecimal(row.testada),
	dataReferencia: (row) => formatDateBr(row.dataReferencia as string | null),
};

const IMOVEL_FIELDS = [
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

const TERRENO_FIELDS = [
	"avaliador",
	"endereco",
	"bairro",
	"municipio",
	"uf",
	"coordenadaS",
	"coordenadaW",
	"areaTerreno",
	"valorTerreno",
	"infraestrutura",
	"dataReferencia",
] as const;

const PLANILHA_PRESETS = {
	imovel: { fields: IMOVEL_FIELDS, filename: "amostras.xlsx" },
	terreno: { fields: TERRENO_FIELDS, filename: "amostras-terreno.xlsx" },
} satisfies Record<string, { fields: readonly string[]; filename: string }>;

const RAE_EXCLUDED_FIELDS = new Set([
	"id",
	"avaliadorId",
	"equacaoSISDEA",
	"createdAt",
	"updatedAt",
]);

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
		if (file.type !== "application/pdf") {
			throw status(400, { message: "O arquivo deve ser um pdf" });
		}

		const buffer = Buffer.from(await file.arrayBuffer());
		if (!buffer.subarray(0, 4).equals(PDF_MAGIC)) {
			throw status(400, { message: "O arquivo deve ser um pdf válido" });
		}

		const doc = await pdf(buffer, { scale: 2.5 });
		const pageImages: Buffer[] = [];
		for await (const page of doc) {
			pageImages.push(page);
		}

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

	static async generatePlanilha(
		tipo: keyof typeof PLANILHA_PRESETS = "imovel",
	): Promise<{
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

		const { fields, filename } = PLANILHA_PRESETS[tipo];

		const workbook = new ExcelJS.Workbook();
		const sheet = workbook.addWorksheet("Amostras");

		sheet.columns = fields.map((field) => ({
			header: field,
			key: field,
			width: 25,
		}));
		sheet.getRow(1).font = { bold: true, size: 12 };

		for (const row of rows) {
			const record = row as Record<string, unknown>;
			sheet.addRow(
				fields.map((field) => {
					const resolver = FIELD_RESOLVERS[field];
					return cellValue(resolver ? resolver(record) : record[field]);
				}),
			);
		}

		const buffer = await workbook.xlsx.writeBuffer();
		return { buffer: Buffer.from(buffer), filename };
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

		const { avaliador, incidencias, acumuladosPropostos, ...amostraScalars } =
			amostra;

		const entries: [string, unknown][] = [
			...(avaliador
				? Object.entries(avaliador)
						.filter(([key]) => key !== "id")
						.map(([key, value]): [string, unknown] => [
							`avaliador_${key}`,
							value,
						])
				: []),
			...Object.entries(amostraScalars)
				.filter(([key]) => !RAE_EXCLUDED_FIELDS.has(key))
				.map(([key, value]): [string, unknown] => [
					key,
					DECIMAL_FIELDS.has(key)
						? toDecimal(value)
						: DATE_FIELDS.has(key)
							? formatDateBr(value as string | null)
							: value,
				]),
			[
				"incidencias",
				incidencias.map((row) => toDecimal(row.percentual)),
			],
			[
				"acumuladoProposto",
				acumuladosPropostos.map((row) => toDecimal(row.percentual)),
			],
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
