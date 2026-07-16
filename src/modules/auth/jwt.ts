import { jwt } from "@elysiajs/jwt";
import { env } from "@/config/env";

export const authJwt = jwt({ name: "jwt", secret: env.JWT_SECRET });
