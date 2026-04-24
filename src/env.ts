import { Type } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";

const envSchema = Type.Object({
	DATABASE_URL: Type.String({ pattern: "^postgresql://" }),
	OPENAI_API_KEY: Type.String({ minLength: 1 }),
});

export const env = Value.Decode(envSchema, Bun.env) as typeof Bun.env & {
	DATABASE_URL: string;
	OPENAI_API_KEY: string;
};
