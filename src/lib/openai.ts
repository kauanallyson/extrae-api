import OpenAI from "openai";

export const openai = new OpenAI({
	timeout: 20 * 1000, // 20s
});
