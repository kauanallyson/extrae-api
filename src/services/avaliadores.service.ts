import type {
	AvaliadorInsert,
	AvaliadorSelect,
	AvaliadorUpdate,
} from "@/models/avaliadores.model";
import {
	createAvaliador,
	deleteById,
	findAll,
	findById,
	updateAvaliador,
} from "@/repo/avaliadores.repo";
import { mapDatabaseError } from "@/utils/db-errors";
import { HttpError } from "@/utils/http-error";

const WRITE_ERRORS = {
	conflict: "Ja existe um avaliador com este CPF ou CNPJ.",
	foreignKey: "Referencia invalida.",
	invalid: "Os dados do avaliador sao invalidos.",
};

function notFound(id: number): HttpError {
	return new HttpError(404, { message: `Avaliador ${id} nao encontrado.` });
}

export async function listAvaliadores(): Promise<AvaliadorSelect[]> {
	return findAll();
}

export async function getAvaliadorById(
	id: number,
): Promise<AvaliadorSelect | null> {
	return findById(id);
}

export async function avaliadorCreate(
	avaliadorRequest: AvaliadorInsert,
): Promise<AvaliadorSelect | null> {
	try {
		return await createAvaliador(avaliadorRequest);
	} catch (e) {
		const response = mapDatabaseError(e, {
			...WRITE_ERRORS,
			default: "Ocorreu um erro ao salvar o avaliador.",
		});
		throw new HttpError(response.status, response.body);
	}
}

export async function avaliadorUpdate(
	id: number,
	avaliadorRequest: AvaliadorUpdate,
): Promise<AvaliadorSelect> {
	try {
		const avaliador = await updateAvaliador(id, avaliadorRequest);
		if (!avaliador) throw notFound(id);
		return avaliador;
	} catch (e) {
		if (e instanceof HttpError) throw e;
		const response = mapDatabaseError(e, {
			...WRITE_ERRORS,
			default: "Ocorreu um erro ao atualizar o avaliador.",
		});
		throw new HttpError(response.status, response.body);
	}
}

export async function deleteAvaliador(id: number): Promise<AvaliadorSelect> {
	const avaliador = await deleteById(id);
	if (!avaliador) throw notFound(id);
	return avaliador;
}
