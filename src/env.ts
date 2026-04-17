import { z } from "zod";

const envSchema = z.object({
	DATABASE_URL: z.url().startsWith("postgresql://"),
	OPENAI_API_KEY: z.string().nonempty(),
});

export const env = envSchema.parse(Bun.env);
