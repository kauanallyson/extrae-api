import type { ZodType } from "zod";
import { HttpError } from "./http-error";

export function parse<T>(
	schema: ZodType<T>,
	data: unknown,
	message = "Dados inválidos",
): T {
	const result = schema.safeParse(data);
	if (!result.success) {
		throw new HttpError(400, {
			message: result.error.issues[0]?.message ?? message,
		});
	}
	return result.data;
}
