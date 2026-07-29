import type { db } from "@/config/db";
import type { MunicipioSelect } from "@/modules/municipios/model";
import type { AmostrasModel, SelectAmostra } from "./model";

type AmostrasWith = NonNullable<
	Parameters<typeof db.query.amostras.findFirst>[0]
>["with"];

export const withPercentuais = {
	incidencias: { orderBy: (incidencias, { asc }) => asc(incidencias.ordem) },
	acumuladosPropostos: {
		orderBy: (acumuladosPropostos, { asc }) => asc(acumuladosPropostos.ordem),
	},
	municipio: true,
} satisfies AmostrasWith;

export type AmostraComPercentuais = SelectAmostra & {
	incidencias: { percentual: number }[];
	acumuladosPropostos: { percentual: number }[];
	municipio: MunicipioSelect | null;
};

type ComMunicipio = {
	municipio: MunicipioSelect | null;
	municipioId: number | null;
};

/** Amostra com municipio e uf de volta como strings planas, sem a chave da FK. */
export type Achatada<T extends ComMunicipio> = Omit<
	T,
	"municipio" | "municipioId"
> & {
	municipio: string | null;
	uf: string | null;
};

/**
 * Traz a relacao de volta ao formato plano que a API sempre expos. Necessario
 * tambem para o RAE: `raeEntries` espalha a amostra inteira em celulas e
 * despejaria o objeto do municipio numa delas.
 */
export function flattenMunicipio<T extends ComMunicipio>({
	municipio,
	municipioId: _municipioId,
	...amostra
}: T): Achatada<T> {
	return {
		...amostra,
		municipio: municipio?.nome ?? null,
		uf: municipio?.uf ?? null,
	} as Achatada<T>;
}

export function toSelect(row: AmostraComPercentuais): AmostrasModel["select"] {
	const {
		incidencias: incidenciasRows,
		acumuladosPropostos: acumuladoRows,
		...amostra
	} = flattenMunicipio(row);

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
