// Temporary shim during the Elysia migration — will be deleted at cutover.
import { AmostrasModel } from "@/modules/amostras/model";

export {
	type BuildFiltersResult,
	buildAmostrasFilters,
} from "@/modules/amostras/filters";
export const amostrasFilterSchema = AmostrasModel.filter;
