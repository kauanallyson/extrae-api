import { Elysia, status } from "elysia";
import { authJwt } from "./jwt";

export const authGuard = new Elysia({ name: "auth-guard" })
	.use(authJwt)
	.derive({ as: "global" }, async ({ headers, jwt }) => {
		const authHeader = headers.authorization;
		const token = authHeader?.startsWith("Bearer ")
			? authHeader.slice(7)
			: undefined;
		if (!token) throw status(401, { message: "Token não informado." });

		const payload = await jwt.verify(token);
		// jwt.verify() resolves to `false` (not undefined/null) on an invalid/expired token, so `&&` short-circuits safely
		const userId = payload && Number(payload.sub);
		if (!userId) throw status(401, { message: "Token inválido ou expirado." });

		return { userId };
	});
