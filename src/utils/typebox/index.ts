import { t } from "elysia";

export const idParamsSchema = t.Object({
	id: t.Integer(),
});

export function firstIssueMessage(error: unknown): string {
	const all = (
		error as {
			all?: Array<{
				path?: unknown;
				message?: string;
				schema?: { error?: unknown };
			}>;
		}
	).all;
	const issue = all?.[0];
	if (!issue?.message) return "Dados inválidos";

	const schemaError = issue.schema?.error;
	if (typeof schemaError === "string") return schemaError;

	const path = Array.isArray(issue.path)
		? issue.path
				.map((segment: unknown) =>
					typeof segment === "object" && segment !== null && "key" in segment
						? (segment as { key: unknown }).key
						: segment,
				)
				.join(".")
		: typeof issue.path === "string"
			? issue.path.replace(/^\//, "").replaceAll("/", ".")
			: "";

	return path && path !== "root" ? `${path}: ${issue.message}` : issue.message;
}
