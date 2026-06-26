import "express-async-errors";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { errorHandler } from "./middleware/error-handler.middleware";
import { router } from "./routes";

const app = express();

app.use(helmet());
app.use(
	cors({
		origin: "https://extrae.vercel.app",
		exposedHeaders: ["Content-Disposition"],
	}),
);
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.use(router);
app.use(errorHandler);

export { app };
