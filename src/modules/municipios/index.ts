import { Elysia } from "elysia";
import { MunicipiosModel } from "./model";
import { Municipios } from "./service";

export const municipios = new Elysia({ prefix: "/municipios" }).get(
	"/",
	() => Municipios.list(),
	{ response: MunicipiosModel.listResponse },
);
