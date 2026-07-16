import { eq } from "drizzle-orm";
import { status } from "elysia";
import { db } from "@/config/db";
import { type UsuarioSelect, usuarios } from "@/modules/usuarios/model";
import type { AuthModel } from "./model";

export type PublicUser = Pick<UsuarioSelect, "id" | "nome" | "email">;

function toPublicUser(row: UsuarioSelect): PublicUser {
	return { id: row.id, nome: row.nome, email: row.email };
}

export abstract class Auth {
	static async register(data: AuthModel["register"]): Promise<PublicUser> {
		const existing = await Auth.findByEmail(data.email);
		if (existing) {
			throw status(409, { message: "Já existe um usuário com este e-mail." });
		}

		const senhaHash = await Bun.password.hash(data.senha);
		const [row] = await db
			.insert(usuarios)
			.values({ nome: data.nome, email: data.email, senhaHash })
			.returning();

		if (!row) {
			throw status(500, { message: "Ocorreu um erro ao criar o usuário." });
		}
		return toPublicUser(row);
	}

	static async login(data: AuthModel["login"]): Promise<PublicUser> {
		const row = await Auth.findByEmail(data.email);
		// same message for both cases so we don't leak which emails are registered
		if (!row || !(await Bun.password.verify(data.senha, row.senhaHash))) {
			throw status(401, { message: "Credenciais inválidas." });
		}
		return toPublicUser(row);
	}

	static async me(id: number): Promise<PublicUser> {
		const [row] = await db
			.select()
			.from(usuarios)
			.where(eq(usuarios.id, id))
			.limit(1);

		// id comes from a verified JWT, so a missing row means the session is stale, not a missing resource — 401, not 404
		if (!row) throw status(401, { message: "Usuário não encontrado." });
		return toPublicUser(row);
	}

	private static async findByEmail(
		email: string,
	): Promise<UsuarioSelect | undefined> {
		const [row] = await db
			.select()
			.from(usuarios)
			.where(eq(usuarios.email, email))
			.limit(1);
		return row;
	}
}
