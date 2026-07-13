import { Value } from "@sinclair/typebox/value";
import { t } from "elysia";

const envSchema = t.Object({
	PORT: t.Integer({ minimum: 1, maximum: 65535 }),
	DATABASE_URL: t.String({ minLength: 1, pattern: "^postgres(ql)?://" }),
	OPENAI_API_KEY: t.String({ minLength: 1 }),
});

export const env = Value.Parse(envSchema, {
	PORT: process.env.PORT,
	DATABASE_URL: process.env.DATABASE_URL,
	OPENAI_API_KEY: process.env.OPENAI_API_KEY,
});
