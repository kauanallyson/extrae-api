import type { SelectAmostra } from "@/models/amostras.model";

const PADRAO_ACABAMENTO_ORDEM = [
	"Mínimo",
	"Baixo",
	"Normal (c/ aspectos de baixo)",
	"Normal (forte predominância)",
	"Normal (c/ aspectos de alto)",
	"Alto (por predominância)",
	"Alto (superior, luxo)",
] as const;

const ESTADO_CONSERVACAO_ORDEM = [
	"Em construção ou na planta",
	"Bom (aparência de novo)",
	"Bom (aparência de usado)",
	"Regular (reparos simples)",
	"Regular (reparos importantes)",
	"Ruim",
] as const;

const KM_POR_GRAU = 111;

const DMS_REGEX = /^(\d+)º(\d+)'(\d+(?:,\d+)?)"$/;

export function parseCoordenadaDms(value: string | null): number | null {
	if (!value) return null;
	const match = DMS_REGEX.exec(value.trim());
	if (!match) return null;

	const [, grausStr, minStr, segStr] = match;
	const graus = Number(grausStr);
	const min = Number(minStr);
	const seg = Number(segStr.replace(",", "."));
	if ([graus, min, seg].some(Number.isNaN)) return null;

	return graus + min / 60 + seg / 3600;
}

export function parseDataReferencia(value: string | null): Date | null {
	if (!value) return null;
	const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());
	if (!match) return null;

	const [, dia, mes, ano] = match;
	const date = new Date(Number(ano), Number(mes) - 1, Number(dia));
	return Number.isNaN(date.getTime()) ? null : date;
}

export function distanciaKm(
	coords1: { lat: number; lon: number },
	coords2: { lat: number; lon: number },
): number {
	const deltaLatKm = (coords1.lat - coords2.lat) * KM_POR_GRAU;
	const deltaLonKm = (coords1.lon - coords2.lon) * KM_POR_GRAU;
	return Math.sqrt(deltaLatKm ** 2 + deltaLonKm ** 2);
}

function scoreDistancia(distKm: number, raioKm: number): number {
	return Math.max(0, 1 - distKm / raioKm);
}

function scoreRelativo(a: number | null, b: number | null): number | null {
	if (a === null || b === null) return null;
	const maior = Math.max(Math.abs(a), Math.abs(b));
	if (maior === 0) return 1;
	return Math.max(0, 1 - Math.abs(a - b) / maior);
}

function scoreOrdinal(
	ordem: readonly string[],
	a: string | null,
	b: string | null,
): number | null {
	if (!a || !b) return null;
	const indiceA = ordem.indexOf(a);
	const indiceB = ordem.indexOf(b);
	if (indiceA === -1 || indiceB === -1) return null;

	const maxDiferenca = ordem.length - 1;
	return 1 - Math.abs(indiceA - indiceB) / maxDiferenca;
}

const CAP_DIAS_DATA_REFERENCIA = 5 * 365;

function scoreDataReferencia(a: Date | null, b: Date | null): number | null {
	if (!a || !b) return null;
	const diffDias = Math.abs(a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24);
	return Math.max(
		0,
		1 - Math.min(diffDias, CAP_DIAS_DATA_REFERENCIA) / CAP_DIAS_DATA_REFERENCIA,
	);
}

const PESOS = {
	distancia: 0.3,
	areaTerreno: 0.15,
	areaConstruida: 0.15,
	padraoAcabamento: 0.15,
	estadoConservacao: 0.15,
	dataReferencia: 0.1,
};

export interface AmostraSimilar {
	amostra: SelectAmostra;
	score: number;
	distanciaKm: number;
}

export type SimilaridadeAlvo = Pick<
	SelectAmostra,
	| "coordenadaS"
	| "coordenadaW"
	| "areaTerreno"
	| "areaConstruida"
	| "padraoAcabamento"
	| "estadoConservacao"
	| "dataReferencia"
>;

export function calcularScore(
	alvo: SimilaridadeAlvo,
	candidata: SelectAmostra,
	distKm: number,
	raioKm: number,
): number {
	const componentes: Array<{ score: number | null; peso: number }> = [
		{ score: scoreDistancia(distKm, raioKm), peso: PESOS.distancia },
		{
			score: scoreRelativo(alvo.areaTerreno, candidata.areaTerreno),
			peso: PESOS.areaTerreno,
		},
		{
			score: scoreRelativo(alvo.areaConstruida, candidata.areaConstruida),
			peso: PESOS.areaConstruida,
		},
		{
			score: scoreOrdinal(
				PADRAO_ACABAMENTO_ORDEM,
				alvo.padraoAcabamento,
				candidata.padraoAcabamento,
			),
			peso: PESOS.padraoAcabamento,
		},
		{
			score: scoreOrdinal(
				ESTADO_CONSERVACAO_ORDEM,
				alvo.estadoConservacao,
				candidata.estadoConservacao,
			),
			peso: PESOS.estadoConservacao,
		},
		{
			score: scoreDataReferencia(
				parseDataReferencia(alvo.dataReferencia),
				parseDataReferencia(candidata.dataReferencia),
			),
			peso: PESOS.dataReferencia,
		},
	];

	const validos = componentes.filter(
		(c): c is { score: number; peso: number } => c.score !== null,
	);
	const somaPesos = validos.reduce((soma, c) => soma + c.peso, 0);
	if (somaPesos === 0) return 0;

	const somaPonderada = validos.reduce((soma, c) => soma + c.score * c.peso, 0);
	return somaPonderada / somaPesos;
}

export interface Estimativa {
	valorImovel: number | null;
	valorTerreno: number | null;
}

export function estimarValores(similares: AmostraSimilar[]): Estimativa {
	if (similares.length === 0) return { valorImovel: null, valorTerreno: null };

	const somaScores = similares.reduce((soma, s) => soma + s.score, 0);
	if (somaScores === 0) return { valorImovel: null, valorTerreno: null };

	const mediaPonderada = (valores: (number | null)[]): number | null => {
		let somaValores = 0;
		let somaScoresValidos = 0;
		for (let i = 0; i < similares.length; i++) {
			const valor = valores[i];
			if (valor === null) continue;
			somaValores += valor * similares[i].score;
			somaScoresValidos += similares[i].score;
		}
		if (somaScoresValidos === 0) return null;
		return somaValores / somaScoresValidos;
	};

	return {
		valorImovel: mediaPonderada(similares.map((s) => s.amostra.valorImovel)),
		valorTerreno: mediaPonderada(similares.map((s) => s.amostra.valorTerreno)),
	};
}
