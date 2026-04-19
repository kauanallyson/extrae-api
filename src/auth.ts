import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { openAPI } from "better-auth/plugins";
import { db } from "@/db";

export const auth = betterAuth({
	basePath: "/api/auth",
	plugins: [openAPI()],
	database: drizzleAdapter(db, {
		provider: "pg",
		usePlural: true,
	}),
	emailAndPassword: {
		enabled: true,
		autoSignIn: true,
		password: {
			hash: (password: string) => Bun.password.hash(password),
			verify: ({ password, hash }) => Bun.password.verify(password, hash),
		},
	},
	session: {
		expiresIn: 60 * 60 * 24 * 7, // uma semana
		cookieCache: {
			enabled: true,
			maxAge: 60 * 5, // 5 min
		},
	},
	advanced: {
		database: {
			generateId: false,
		},
	},
});
