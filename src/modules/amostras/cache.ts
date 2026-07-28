import { withRedis } from "@/config/redis";
import type { ValorUnitarioStats } from "./stats";

/**
 * Contador de versao do cache de estatisticas. Toda escrita em amostras faz um
 * INCR aqui, o que torna todas as chaves da versao anterior inalcancaveis de
 * uma vez - elas somem sozinhas pelo TTL. Nunca recebe expiracao.
 */
const VERSION_KEY = "amostras:stats:v";

/** TTL de rede de seguranca: a invalidacao real vem do INCR, nao da expiracao. */
const TTL_SECONDS = 60 * 60;

function statsKey(version: number, municipio?: string): string {
	return `amostras:stats:v${version}:${municipio ?? "_all"}`;
}

async function currentVersion(): Promise<number | undefined> {
	return withRedis("GET versao das stats", async (client) => {
		const raw = await client.get(VERSION_KEY);
		if (raw === null) return 0;

		const parsed = Number.parseInt(raw, 10);
		return Number.isFinite(parsed) ? parsed : 0;
	});
}

/**
 * Retorna as estatisticas do cache quando disponiveis; caso contrario executa
 * `compute` e guarda o resultado. Redis indisponivel apenas encarece a
 * chamada, nunca a quebra.
 */
export async function cachedStats(
	municipio: string | undefined,
	compute: () => Promise<ValorUnitarioStats>,
): Promise<ValorUnitarioStats> {
	const version = await currentVersion();
	if (version === undefined) return compute();

	const key = statsKey(version, municipio);

	const hit = await withRedis("GET stats", (client) => client.get(key));
	if (hit) {
		try {
			return JSON.parse(hit) as ValorUnitarioStats;
		} catch {
			// entrada corrompida: recalcula e sobrescreve logo abaixo
		}
	}

	const stats = await compute();
	await withRedis("SET stats", (client) =>
		client.set(key, JSON.stringify(stats), "EX", TTL_SECONDS),
	);

	return stats;
}

/** Invalida todas as estatisticas em cache. Chamar apos a escrita no banco. */
export async function invalidateStats(): Promise<void> {
	await withRedis("INCR versao das stats", (client) =>
		client.incr(VERSION_KEY),
	);
}
