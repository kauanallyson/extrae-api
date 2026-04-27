type DbErrorLike = {
	code?: string;
	detail?: string;
	message?: string;
	constraint?: string;
};

type DbErrorMessages = {
	conflict: string;
	foreignKey: string;
	invalid: string;
	default: string;
};

export function mapDatabaseError(
	error: unknown,
	messages: DbErrorMessages,
): { status: number; body: { message: string } } {
	const dbError = error as DbErrorLike;

	console.error("Database operation failed", {
		code: dbError?.code,
		constraint: dbError?.constraint,
		detail: dbError?.detail,
		message: dbError?.message,
	});

	switch (dbError?.code) {
		case "23505":
			return {
				status: 409,
				body: { message: messages.conflict },
			};
		case "23503":
			return {
				status: 400,
				body: { message: messages.foreignKey },
			};
		case "22P02":
			return {
				status: 400,
				body: { message: messages.invalid },
			};
		default:
			return {
				status: 500,
				body: { message: messages.default },
			};
	}
}
