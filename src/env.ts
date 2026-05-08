import { z } from "zod";

const envSchema = z.object({
	DATABASE_URL: z.string().startsWith("postgresql://"),
	OPENAI_API_KEY: z.string().min(1),
});

export const env = envSchema.parse(Bun.env);
