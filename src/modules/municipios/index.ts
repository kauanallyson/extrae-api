import { Elysia } from "elysia";
import { authGuard } from "@/modules/auth/guard";
import { MunicipiosModel } from "./model";
import { Municipios } from "./service";

export const municipios = new Elysia({ prefix: "/municipios" })
	.use(authGuard)
	.get("/", () => Municipios.list(), {
		response: MunicipiosModel.listResponse,
	});
