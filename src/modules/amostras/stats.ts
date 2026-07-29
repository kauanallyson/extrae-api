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

/**
 * Estatisticas descritivas de valorUnitario, calculadas inteiramente no
 * Postgres. Outliers seguem a regra de Tukey (cercas de 1.5 x IQR).
 *
 * O recorte por municipio chega ja resolvido em ids - uma lista, porque o mesmo
 * nome pode existir em mais de uma UF. `= any(array)` e usado no lugar de `in`
 * justamente porque aceita array vazio: nome que nao resolveu para nenhum
 * municipio devolve estatisticas zeradas em vez de SQL invalido.
 */
export async function valorUnitarioStats(
	municipioIds?: number[],
): Promise<ValorUnitarioStats> {
	const municipioFilter = municipioIds
		? sql`and ${amostras.municipioId} = any(${sql.param(municipioIds)}::int[])`
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
			round(f.min::numeric, 2)::double precision         as min,
			round(f.max::numeric, 2)::double precision         as max,
			round(f.mean::numeric, 2)::double precision        as mean,
			round(f.q1::numeric, 2)::double precision          as q1,
			round(f.median::numeric, 2)::double precision      as median,
			round(f.q3::numeric, 2)::double precision          as q3,
			round(f.iqr::numeric, 2)::double precision         as iqr,
			round(f.std_dev::numeric, 2)::double precision     as std_dev,
			round(f.lower_fence::numeric, 2)::double precision as lower_fence,
			round(f.upper_fence::numeric, 2)::double precision as upper_fence,
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
		min: row.min,
		max: row.max,
		mean: row.mean,
		median: row.median,
		q1: row.q1,
		q3: row.q3,
		iqr: row.iqr,
		stdDev: row.std_dev,
		lowerFence: row.lower_fence,
		upperFence: row.upper_fence,
		outlierIds: row.outlier_ids,
	};
}
