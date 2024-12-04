// src/app.ts
import express, { Express, Request, Response, NextFunction } from "express";
import { connectDb } from "./services/database";
import bodyParser from "body-parser";
import { routes } from "./apis";
import dotenv from "dotenv";
import cors from "cors";
import { setupSchedules } from "./services/schedulerService";

const app: Express = express();

async function start() {
  try {
    dotenv.config();

    await connectDb();

    app.use(cors());
    app.use(bodyParser.json());
    app.use((req: Request, res: Response, next: NextFunction) => {
      console.log(`${req.method} ${req.url}`);
      next();
    });

    app.use("/", routes);

    await setupSchedules();
  } catch (err) {
    console.error("Failed to start the application:", err);
    process.exit(1);
  }
}

start();

export default app;
