// src/app.ts
import express, { Express, Request, Response, NextFunction } from "express";
import { fetchAndStoreSnmpData } from "./services/snmpService";
import { connectDb } from "./services/database";
import bodyParser from "body-parser";
import { routes } from "./apis";
import dotenv from "dotenv";
import cors from "cors";
const app: Express = express();

async function start() {
  try {
    connectDb().catch((error) => {
      console.error(
        "Failed to start app due to database connection error",
        error
      );
    });

    dotenv.config();

    app.use(cors());
    app.use(bodyParser.json());

    app.use((req: Request, res: Response, next: NextFunction) => {
      console.log(`${req.method} ${req.url}`);
      next();
    });

    app.use("/", routes);

    setInterval(async () => {
      try {
        console.log("Fetching and storing SNMP data...");
        const results = await fetchAndStoreSnmpData();
        console.log("SNMP data stored:", results.length, "entries.");
      } catch (error) {
        console.error("Error in scheduled SNMP data fetching:", error);
      }
    }, 10000);
  } catch (err) {
    console.error(err);
  }
}

start();

export default app;
