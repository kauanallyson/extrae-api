import { withRedis } from "@/config/redis";
import { statsVersion } from "@/modules/amostras/cache";
import type { MunicipiosModel } from "./model";

/**
 * A lista deriva de amostras, entao acompanha o contador de versao das
 * estatisticas: as escritas em amostras ja o incrementam e nenhum ponto de
 * invalidacao novo e necessario.
 */
function listKey(version: number): string {
	return `municipios:list:v${version}`;
}

/** TTL de rede de seguranca: a invalidacao real vem do INCR, nao da expiracao. */
const TTL_SECONDS = 60 * 60;

export async function cachedMunicipios(
	compute: () => Promise<MunicipiosModel["listResponse"]>,
): Promise<MunicipiosModel["listResponse"]> {
	const version = await statsVersion();
	if (version === undefined) return compute();

	const key = listKey(version);

	const hit = await withRedis("GET municipios", (client) => client.get(key));
	if (hit) {
		try {
			return JSON.parse(hit) as MunicipiosModel["listResponse"];
		} catch {
			// entrada corrompida: recalcula e sobrescreve logo abaixo
		}
	}

	const lista = await compute();
	await withRedis("SET municipios", (client) =>
		client.set(key, JSON.stringify(lista), "EX", TTL_SECONDS),
	);

	return lista;
}
