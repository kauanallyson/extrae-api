import type { db } from "@/config/db";
import type { AmostrasModel, SelectAmostra } from "./model";

type AmostrasWith = NonNullable<
	Parameters<typeof db.query.amostras.findFirst>[0]
>["with"];

export const withPercentuais = {
	incidencias: { orderBy: (incidencias, { asc }) => asc(incidencias.ordem) },
	acumuladosPropostos: {
		orderBy: (acumuladosPropostos, { asc }) => asc(acumuladosPropostos.ordem),
	},
} satisfies AmostrasWith;

export type AmostraComPercentuais = SelectAmostra & {
	incidencias: { percentual: number }[];
	acumuladosPropostos: { percentual: number }[];
};

export function toSelect({
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

export function splitPercentuais<
	T extends {
		incidencias?: number[] | null;
		acumuladoProposto?: number[] | null;
	},
>(
	data: T,
): {
	amostra: Omit<T, "incidencias" | "acumuladoProposto">;
	incidencias: number[] | null | undefined;
	acumuladoProposto: number[] | null | undefined;
} {
	const {
		incidencias: incidenciasValues,
		acumuladoProposto: acumuladoValues,
		...amostra
	} = data;
	return {
		amostra,
		incidencias: incidenciasValues,
		acumuladoProposto: acumuladoValues,
	};
}
