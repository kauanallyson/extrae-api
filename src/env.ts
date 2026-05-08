import { z } from "zod";

const envSchema = z.object({
	DATABASE_URL: z.string().regex(/^postgr(?:es|esql):\/\//),
	OPENAI_API_KEY: z.string().min(1),
});

export const env = envSchema.parse(Bun.env);
