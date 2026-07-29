import { asc, count, desc, eq, sql } from "drizzle-orm";
import { status } from "elysia";
import { db } from "@/config/db";
import { amostras } from "@/modules/amostras/model";
import { cachedMunicipios } from "./cache";
import { type MunicipiosModel, municipios, normalizarMunicipio } from "./model";

/** Handle de transacao do drizzle, para reaproveitar a conexao do chamador. */
export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export abstract class Municipios {
	static async list(): Promise<MunicipiosModel["listResponse"]> {
		return cachedMunicipios(() =>
			db
				.select({
					id: municipios.id,
					nome: municipios.nome,
					uf: municipios.uf,
					totalAmostras: count(amostras.id),
				})
				.from(municipios)
				// left join mantem na lista o municipio que ficou sem amostras
				.leftJoin(amostras, eq(amostras.municipioId, municipios.id))
				.groupBy(municipios.id, municipios.nome, municipios.uf)
				.orderBy(desc(count(amostras.id)), asc(municipios.nome)),
		);
	}

	/**
	 * Resolve um nome para o seu id, criando a linha se ainda nao existir - nome
	 * desconhecido nunca bloqueia uma escrita. Nome vazio resolve para `null`.
	 */
	static async getOrCreateId(
		tx: Tx,
		nome: string | null | undefined,
		uf: string | null | undefined,
	): Promise<number | null> {
		const nomeLimpo = nome?.trim();
		if (!nomeLimpo) return null;

		const [row] = await tx
			.insert(municipios)
			.values({ nome: nomeLimpo, uf: uf?.trim().toUpperCase() || null })
			.onConflictDoUpdate({
				target: [municipios.nomeNormalizado, municipios.uf],
				// no-op: `do nothing` nao retornaria linha no conflito, e reatribuir
				// o proprio nome preserva a primeira grafia registrada
				set: { nome: sql.raw("municipios.nome") },
			})
			.returning({ id: municipios.id });

		if (!row) {
			throw status(500, { message: "Ocorreu um erro ao salvar o municipio." });
		}
		return row.id;
	}

	/**
	 * Ids que casam com o nome, em qualquer grafia. Retorna lista porque o filtro
	 * publico e so por nome, e o mesmo nome existe em mais de uma UF.
	 */
	static async findIdsByNome(nome: string): Promise<number[]> {
		const rows = await db
			.select({ id: municipios.id })
			.from(municipios)
			.where(eq(municipios.nomeNormalizado, normalizarMunicipio(nome)))
			.orderBy(asc(municipios.id));

		return rows.map((row) => row.id);
	}
}
