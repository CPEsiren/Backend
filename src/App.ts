// src/app.ts
import express, { Express, Request, Response, NextFunction } from "express";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import cors from "cors";
import User from "./routes/Userapi";
import Interface from "./routes/Interfaceapi";
import Alert from "./routes/Alertapi";
import Host from "./routes/Host";
import SNMP from "./routes/DataSNMP";
import { MongoClient } from "mongodb";
import { env } from "process";

const app: Express = express();

async function start() {
  try {
    dotenv.config();

    app.use(cors());
    app.use(bodyParser.json());

    app.use((req: Request, res: Response, next: NextFunction) => {
      console.log(`${req.method} ${req.url}`);
      next();
    });

    app.get("/", (req: Request, res: Response) => {
      res.send("Our Server");
    });

    app.use("/getUser", User);
    app.use("/getInterface", Interface);
    app.use("/getAlert", Alert);
    app.use("/SNMP", SNMP);
    app.use("/host", Host);
    app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
      console.error("Unhandled error:", err);
      res.status(500).json({ error: "Something went wrong!" });
    });
  } catch (err) {
    console.log(err);
  }
}
start();

export default app;
