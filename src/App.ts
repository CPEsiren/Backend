// src/app.ts
import express, { Express, Request, Response, NextFunction } from "express";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import cors from "cors";
import User from "./routes/Userapi";
import Interface from "./routes/Interfaceapi";
import Alert from "./routes/Alertapi";
import deviceRoutes from "./routes/Deviceapi";
import Host from "./routes/Host";
import Template from "./routes/Template";
import Item from "./routes/Item";
import History from "./routes/History";
// import Details from "./routes/Details";
import { connectDb } from "./services/database";
import { fetchAndStoreSnmpData } from "./services/snmpService";

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
    app.get("/", (req: Request, res: Response) => {
      res.send("Our Server");
    });

    app.use("/getUser", User);
    app.use("/getDevice", deviceRoutes);
    app.use("/getInterface", Interface);
    app.use("/getAlert", Alert);
    // app.use("/getDetails", Details);
    app.use("/host", Host);
    app.use("/template", Template);
    app.use("/item", Item);
    app.use("/history", History);

    setInterval(async () => {
      try {
        console.log("Fetching and storing SNMP data...");
        const results = await fetchAndStoreSnmpData();
        console.log("SNMP data stored:", results.length, "entries.");
      } catch (error) {
        console.error("Error in scheduled SNMP data fetching:", error);
      }
    }, 10000);

    app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
      console.error("Unhandled error:", err);
      res.status(500).json({ error: "Something went wrong!" });
    });
  } catch (err) {
    console.error(err);
  }
}

start();

export default app;
