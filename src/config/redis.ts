import { RedisClient } from "bun";
import { env } from "@/config/env";

/** Teto rigido por operacao, para que o cache jamais segure uma requisicao. */
const OPERATION_TIMEOUT_MS = 500;

export const redis = new RedisClient(env.REDIS_URL, {
	connectionTimeout: OPERATION_TIMEOUT_MS,
	// sem isso, comandos emitidos com o Redis fora ficam enfileirados
	// indefinidamente em vez de falhar na hora
	enableOfflineQueue: false,
	autoReconnect: true,
	maxRetries: 1000,
});

let degraded = false;

function markDegraded(operation: string, error: unknown): void {
	if (degraded) return;
	degraded = true;
	console.error(
		`[redis] ${operation} falhou, seguindo sem cache:`,
		error instanceof Error ? error.message : error,
	);
}

redis.onclose = (error) => {
	markDegraded("conexao", error);
};

/**
 * Executa uma operacao no Redis sem nunca propagar erro de conexao. O cache e
 * um acelerador, jamais um ponto de falha: se o Redis estiver fora ou lento, o
 * chamador recebe `undefined` e segue direto para a fonte de dados.
 */
export async function withRedis<T>(
	operation: string,
	fn: (client: RedisClient) => Promise<T>,
): Promise<T | undefined> {
	let timer: ReturnType<typeof setTimeout> | undefined;

	try {
		const result = await Promise.race([
			// com a fila offline desligada, um comando emitido antes da conexao
			// estar de pe e recusado na hora - entao conectamos sob demanda
			(redis.connected ? Promise.resolve() : redis.connect()).then(() =>
				fn(redis),
			),
			new Promise<never>((_, reject) => {
				timer = setTimeout(
					() => reject(new Error(`timeout apos ${OPERATION_TIMEOUT_MS}ms`)),
					OPERATION_TIMEOUT_MS,
				);
			}),
		]);

		if (degraded) {
			degraded = false;
			console.info("[redis] conexao restabelecida, cache reativado.");
		}
		return result;
	} catch (error) {
		markDegraded(operation, error);
		return undefined;
	} finally {
		clearTimeout(timer);
	}
}
