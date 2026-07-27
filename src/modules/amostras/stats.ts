import { sql } from "drizzle-orm";
import { db } from "@/config/db";
import { amostras } from "./model";

export type ValorUnitarioStats = {
	total: number;
	min: number | null;
	max: number | null;
	mean: number | null;
	median: number | null;
	q1: number | null;
	q3: number | null;
	iqr: number | null;
	stdDev: number | null;
	lowerFence: number | null;
	upperFence: number | null;
	outlierIds: number[];
};

type StatsRow = {
	total: number;
	min: number | null;
	max: number | null;
	mean: number | null;
	median: number | null;
	q1: number | null;
	q3: number | null;
	iqr: number | null;
	std_dev: number | null;
	lower_fence: number | null;
	upper_fence: number | null;
	outlier_ids: number[];
};

/** valorUnitario e armazenado em centavos; a API de stats responde em reais. */
function centsToReais(value: number | null): number | null {
	return value === null ? null : value / 100;
}

/**
 * Estatisticas descritivas de valorUnitario, calculadas inteiramente no
 * Postgres. Outliers seguem a regra de Tukey (cercas de 1.5 x IQR).
 */
export async function valorUnitarioStats(
	municipio?: string,
): Promise<ValorUnitarioStats> {
	const municipioFilter = municipio
		? sql`and ${amostras.municipio} = ${municipio}`
		: sql``;

	const result = await db.execute<StatsRow>(sql`
		with vals as (
			select ${amostras.id} as id, ${amostras.valorUnitario} as v
			from ${amostras}
			where ${amostras.valorUnitario} is not null
			${municipioFilter}
		),
		agg as (
			select
				count(*)::int                                   as total,
				min(v)                                          as min,
				max(v)                                          as max,
				avg(v)                                          as mean,
				percentile_cont(0.25) within group (order by v) as q1,
				percentile_cont(0.50) within group (order by v) as median,
				percentile_cont(0.75) within group (order by v) as q3,
				stddev_samp(v)                                  as std_dev
			from vals
		),
		f as (
			select *,
				q3 - q1              as iqr,
				q1 - 1.5 * (q3 - q1) as lower_fence,
				q3 + 1.5 * (q3 - q1) as upper_fence
			from agg
		)
		select
			f.total,
			round(f.min)::double precision         as min,
			round(f.max)::double precision         as max,
			round(f.mean)::double precision        as mean,
			round(f.q1)::double precision          as q1,
			round(f.median)::double precision      as median,
			round(f.q3)::double precision          as q3,
			round(f.iqr)::double precision         as iqr,
			round(f.std_dev)::double precision     as std_dev,
			round(f.lower_fence)::double precision as lower_fence,
			round(f.upper_fence)::double precision as upper_fence,
			coalesce(
				(select array_agg(v.id) from vals v
					where v.v < f.lower_fence or v.v > f.upper_fence),
				'{}'::int[]
			) as outlier_ids
		from f
	`);

	const row = result.rows[0];
	if (!row) {
		throw new Error("A consulta de estatisticas nao retornou nenhuma linha.");
	}

	return {
		total: row.total,
		min: centsToReais(row.min),
		max: centsToReais(row.max),
		mean: centsToReais(row.mean),
		median: centsToReais(row.median),
		q1: centsToReais(row.q1),
		q3: centsToReais(row.q3),
		iqr: centsToReais(row.iqr),
		stdDev: centsToReais(row.std_dev),
		lowerFence: centsToReais(row.lower_fence),
		upperFence: centsToReais(row.upper_fence),
		outlierIds: row.outlier_ids,
	};
}
