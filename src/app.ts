import "express-async-errors";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { amostrasRouter } from "./controllers/amostras.controller";
import { avaliadoresRouter } from "./controllers/avaliadores.controller";
import { errorMiddleware } from "./middleware/error.middleware";

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

app.use("/amostras", amostrasRouter);
app.use("/avaliadores", avaliadoresRouter);
app.use(errorMiddleware);

export { app };
