export class HttpError extends Error {
	constructor(
		public readonly status: number,
		public readonly body: unknown,
	) {
		const message =
			typeof body === "object" && body !== null && "message" in body
				? String((body as { message: unknown }).message)
				: "HttpError";
		super(message);
		this.name = "HttpError";
	}
}
