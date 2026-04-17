import OpenAI from "openai";
import { env } from "@/env";

export const openai = new OpenAI({
	apiKey: env.OPENAI_API_KEY,
	timeout: 30 * 1000, // 30s
});
