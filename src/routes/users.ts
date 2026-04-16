import { Elysia } from "elysia";
import { z } from "zod";
import { db } from "../db";
import { usersTable } from "../db/schema/users";

export const userRoutes = new Elysia({ prefix: "/users" })
	.get("/", async () => {
		const users = await db.select().from(usersTable);
		return users;
	})
	.post(
		"/",
		async ({ body }) => {
			const newUser = await db.insert(usersTable).values(body).returning();
			return newUser[0];
		},
		{
			body: z.object({
				name: z.string(),
				age: z.number(),
				email: z.email(),
			}),
		},
	);
