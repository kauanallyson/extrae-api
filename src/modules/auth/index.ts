import { Elysia } from "elysia";
import { authGuard } from "./guard";
import { authJwt } from "./jwt";
import { AuthModel } from "./model";
import { Auth } from "./service";

export const auth = new Elysia({ prefix: "/auth" })
	.use(authJwt)
	.post(
		"/register",
		async ({ body, jwt, status }) => {
			const user = await Auth.register(body);
			const token = await jwt.sign({ sub: String(user.id) });
			return status(201, { token });
		},
		{ body: AuthModel.register },
	)
	.post(
		"/login",
		async ({ body, jwt }) => {
			const user = await Auth.login(body);
			const token = await jwt.sign({ sub: String(user.id) });
			return { token };
		},
		{ body: AuthModel.login },
	)
	// .guard() scopes authGuard to /me only — a plain .use(authGuard) here would leak the auth requirement to routes registered later (amostras/avaliadores)
	.guard({}, (app) =>
		app.use(authGuard).get("/me", ({ userId }) => Auth.me(userId)),
	);
