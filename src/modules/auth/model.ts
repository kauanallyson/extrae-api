import { t } from "elysia";
import { EMAIL_REGEX } from "@/utils/regex";

export const AuthModel = {
	register: t.Object({
		nome: t.String({ minLength: 1 }),
		email: t.String({ pattern: EMAIL_REGEX }),
		senha: t.String({ minLength: 8 }),
	}),
	login: t.Object({
		email: t.String({ pattern: EMAIL_REGEX }),
		senha: t.String({ minLength: 1 }),
	}),
} as const;

export type AuthModel = {
	[K in keyof typeof AuthModel]: (typeof AuthModel)[K]["static"];
};
