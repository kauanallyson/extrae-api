import { type SQL, sql } from "drizzle-orm";
import {
	char,
	integer,
	pgTable,
	text,
	timestamp,
	unique,
} from "drizzle-orm/pg-core";
import { t } from "elysia";

/** Aplicado depois de `lower()`, entao so cobre minusculas. As duas listas
 * precisam ter o mesmo numero de caracteres: `translate` casa posicao a posicao. */
export const ACENTOS = "áàâãäéèêëíìîïóòôõöúùûüçñ";
export const SEM_ACENTOS = "aaaaaeeeeiiiiooooouuuucn";

/**
 * Forma canonica de um nome de municipio, para que "Belém", "BELEM" e "belem "
 * resolvam sempre para a mesma linha.
 *
 * `translate` e IMMUTABLE, o que permite usa-la em coluna gerada - `unaccent` e
 * apenas STABLE e seria recusada pelo Postgres.
 */
export function normalizarMunicipio(value: SQL | string): SQL {
	return sql`translate(lower(btrim(${value})), ${ACENTOS}, ${SEM_ACENTOS})`;
}

export const municipios = pgTable(
	"municipios",
	{
		id: integer().primaryKey().generatedAlwaysAsIdentity(),
		nome: text().notNull(),
		// literais inline: coluna gerada nao aceita parametros vinculados
		nomeNormalizado: text()
			.generatedAlwaysAs(
				sql.raw(
					`translate(lower(btrim(nome)), '${ACENTOS}', '${SEM_ACENTOS}')`,
				),
			)
			.notNull(),
		uf: char({ length: 2 }),
		createdAt: timestamp().defaultNow().notNull(),
	},
	(table) => [
		// sem `nullsNotDistinct`, cada uf NULL seria distinta das demais e
		// ("belem", NULL) poderia ser inserido varias vezes
		unique().on(table.nomeNormalizado, table.uf).nullsNotDistinct(),
	],
);

export const MunicipiosModel = {
	listResponse: t.Array(
		t.Object({
			id: t.Integer(),
			nome: t.String(),
			uf: t.Nullable(t.String()),
			totalAmostras: t.Integer(),
		}),
		{
			description:
				"Municipios registrados, do mais para o menos amostrado. O campo nome pode ser usado direto como filtro em /amostras e /amostras/stats.",
		},
	),
} as const;

export type MunicipioSelect = typeof municipios.$inferSelect;
export type MunicipiosModel = {
	[K in keyof typeof MunicipiosModel]: (typeof MunicipiosModel)[K]["static"];
};
