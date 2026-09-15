import { status } from "elysia";

/**
 * Insere/atualiza um registro e converte violacao de unique constraint
 * (postgres 23505) em 409. Cobre a corrida entre o pre-check em memoria (um
 * SELECT antes do INSERT/UPDATE) e a escrita real, que o pre-check sozinho
 * nao fecha.
 */
export async function guardUniqueWrite<T>(
	write: () => Promise<T>,
	message: string,
): Promise<T> {
	try {
		return await write();
	} catch (err) {
		if (err instanceof Error && "code" in err && err.code === "23505") {
			throw status(409, { message });
		}
		throw err;
	}
}
