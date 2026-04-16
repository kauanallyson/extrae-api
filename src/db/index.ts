import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { z } from "zod";

const envSchema = z.object({
	DATABASE_URL: z.url(),
});
const env = envSchema.parse(process.env);

export const db = drizzle(env.DATABASE_URL);
