import cors from "cors";
import express from "express";
import { amostrasAiRouter } from "./routes/amostras-ai";
import { amostrasPlanilhaRouter } from "./routes/amostras-planilha";
import { amostrasRaeRouter } from "./routes/amostras-rae";
import { amostrasRouter } from "./routes/amostras";
import { avaliadoresRouter } from "./routes/avaliadores";
import { env } from "./env";

const app = express();

app.use(
  cors({
    origin: "https://extrae.vercel.app",
    exposedHeaders: ["Content-Disposition"],
  }),
);
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.use("/amostras", amostrasPlanilhaRouter);
app.use("/amostras/ia", amostrasAiRouter);
app.use("/amostras", amostrasRaeRouter);
app.use("/amostras", amostrasRouter);
app.use("/avaliadores", avaliadoresRouter);

app.listen(env.PORT, "0.0.0.0", () => {
  console.log(`Express is running at http://0.0.0.0:${env.PORT}`);
});
