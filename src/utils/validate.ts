import type { ZodType } from "zod";
import { HttpError } from "./http-error";

export function parse<T>(
	schema: ZodType<T>,
	data: unknown,
	message = "Dados inválidos",
): T {
	const result = schema.safeParse(data);
	if (!result.success) {
		const issue = result.error.issues[0];
		const path = issue?.path.join(".");
		const detail = issue
			? path
				? `${path}: ${issue.message}`
				: issue.message
			: message;
		throw new HttpError(400, {
			message: detail,
		});
	}
	return result.data;
}
