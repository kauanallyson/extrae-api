import ExcelJS from "exceljs";
import type { AvaliadorSelect } from "@/modules/avaliadores/model";
import { formatDateBr } from "@/utils/strings";
import { cellValue } from "@/utils/xlsx";
import type { AmostraComPercentuais } from "./mappers";

const DATE_FIELDS = new Set(["dataReferencia"]);

const RAE_EXCLUDED_FIELDS = new Set([
	"id",
	"avaliadorId",
	"equacaoSISDEA",
	"createdAt",
	"updatedAt",
]);

function resolveValue(field: string, value: unknown): unknown {
	if (DATE_FIELDS.has(field)) return formatDateBr(value as string | null);
	return value;
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

export const PLANILHA_PRESETS = {
	imovel: { fields: IMOVEL_FIELDS, filename: "amostras.xlsx" },
	terreno: { fields: TERRENO_FIELDS, filename: "amostras-terreno.xlsx" },
} satisfies Record<string, { fields: readonly string[]; filename: string }>;

export type PlanilhaTipo = keyof typeof PLANILHA_PRESETS;

function createSheet(
	workbook: ExcelJS.Workbook,
	name: string,
	headers: readonly string[],
): ExcelJS.Worksheet {
	const sheet = workbook.addWorksheet(name);
	sheet.columns = headers.map((header) => ({
		header,
		key: header,
		width: 25,
	}));
	sheet.getRow(1).font = { bold: true, size: 12 };
	return sheet;
}

export async function buildPlanilhaWorkbook(
	tipo: PlanilhaTipo,
	rows: Record<string, unknown>[],
): Promise<{ buffer: Buffer; filename: string }> {
	const { fields, filename } = PLANILHA_PRESETS[tipo];

	const workbook = new ExcelJS.Workbook();
	const sheet = createSheet(workbook, "Amostras", fields);

	for (const row of rows) {
		sheet.addRow(
			fields.map((field) => {
				const resolver = FIELD_RESOLVERS[field];
				return cellValue(
					resolver ? resolver(row) : resolveValue(field, row[field]),
				);
			}),
		);
	}

	const buffer = await workbook.xlsx.writeBuffer();
	return { buffer: Buffer.from(buffer), filename };
}

export function raeEntries(
	row: AmostraComPercentuais & { avaliador: AvaliadorSelect | null },
): [string, unknown][] {
	const { avaliador, incidencias, acumuladosPropostos, ...amostra } = row;

	return [
		...(avaliador
			? Object.entries(avaliador)
					.filter(([key]) => key !== "id")
					.map(([key, value]): [string, unknown] => [`avaliador_${key}`, value])
			: []),
		...Object.entries(amostra)
			.filter(([key]) => !RAE_EXCLUDED_FIELDS.has(key))
			.map(([key, value]): [string, unknown] => [
				key,
				resolveValue(key, value),
			]),
		["incidencias", incidencias.map((row) => row.percentual)],
		["acumuladoProposto", acumuladosPropostos.map((row) => row.percentual)],
	];
}

export async function buildRaeWorkbook(
	entries: [string, unknown][],
): Promise<Buffer> {
	const workbook = new ExcelJS.Workbook();
	const sheet = createSheet(
		workbook,
		"Dados RAE",
		entries.map(([key]) => key),
	);

	entries.forEach(([, value], index) => {
		const values = Array.isArray(value) ? value : [value];
		values.forEach((item, offset) => {
			sheet.getRow(2 + offset).getCell(index + 1).value = cellValue(item);
		});
	});

	const buffer = await workbook.xlsx.writeBuffer();
	return Buffer.from(buffer);
}
