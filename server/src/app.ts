import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { env } from "./config/env";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { authRouter } from "./routes/auth.routes";
import { dashboardRouter } from "./routes/dashboard.routes";
import { imagesRouter } from "./routes/images.routes";
import { reportsRouter } from "./routes/reports.routes";
import { scansRouter } from "./routes/scans.routes";
import { usersRouter } from "./routes/users.routes";
import { vulnerabilitiesRouter } from "./routes/vulnerabilities.routes";

export function createApp() {
  const app = express();

  app.use(cors({ origin: env.corsOrigin, credentials: true }));
  app.use(express.json());
  app.use(cookieParser());

  app.get("/health", (_req, res) => res.json({ status: "ok" }));

  app.use("/api/auth", authRouter);
  app.use("/api/users", usersRouter);
  app.use("/api/dashboard", dashboardRouter);
  app.use("/api/images", imagesRouter);
  app.use("/api/scans", scansRouter);
  app.use("/api/vulnerabilities", vulnerabilitiesRouter);
  app.use("/api/reports", reportsRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
