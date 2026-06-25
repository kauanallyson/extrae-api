import type express from "express";

export function errorHandler(
  err: Error,
  _req: express.Request,
  res: express.Response,
  _next: express.NextFunction,
) {
  console.error(err);
  res.status(500).json({ message: "Erro interno do servidor" });
}
