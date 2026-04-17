import OpenAI from "openai";

export const openai = new OpenAI({
	timeout: 30 * 1000, // 30s
});
