import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.url().startsWith("postgresql://"),
  OPENAI_API_KEY: z.string().nonempty(),
  BETTER_AUTH_SECRET: z.string().nonempty(),
  BETTER_AUTH_URL: z.url().startsWith("http"),
  PORT: z.coerce.number().default(3000),
});

export const env = envSchema.parse(Bun.env);
