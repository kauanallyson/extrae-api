import { drizzle } from "drizzle-orm/node-postgres";
import { env } from "@/config/env";
import * as schema from "@/config/schema";

export const db = drizzle(env.DATABASE_URL, { casing: "snake_case", schema });
