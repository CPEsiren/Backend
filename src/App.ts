// src/app.ts
import express, { Express, Request, Response, NextFunction } from "express";
import { addLog, createFileLog } from "./middleware/log";
import { setupSchedules } from "./services/schedulerService";
import { connectDb } from "./services/database";
import bodyParser from "body-parser";
import { routes } from "./apis";
import dotenv from "dotenv";
import cors from "cors";

const app: Express = express();

async function start() {
  await createFileLog();
  try {
    dotenv.config();

    await connectDb();

    app.use(cors());
    app.use(bodyParser.json());
    app.use((req: Request, res: Response, next: NextFunction) => {
      console.log(`${req.method} ${req.url}`);
      // Log requests to the file with Thai timezone
      next();
    });

    app.use("/", routes);

    await setupSchedules();
  } catch (err) {
    await addLog(
      "ERROR",
      err instanceof Error ? err.message : "Unknown error",
      false
    );
    console.error("Failed to start the application:", err);

    process.exit(1);
  }
}

start();

export default app;
