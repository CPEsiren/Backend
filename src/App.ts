// src/app.ts
import express, { Express, Request, Response, NextFunction } from "express";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import cors from "cors";
import User from "./routes/Userapi";
import Interface from "./routes/Interfaceapi";
import Alert from "./routes/Alertapi";
import deviceRoutes from "./routes/Deviceapi";
import Details from "./routes/Details";

dotenv.config();

const app: Express = express();

app.use(cors());
app.use(bodyParser.json());

app.get("/", (req: Request, res: Response) => {
  res.send("Our Server");
});

app.use("/getUser", User);
app.use("/getDevice", deviceRoutes);
app.use("/getInterface", Interface);
app.use("/getAlert", Alert);
app.use("/getDetails", Details);

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Something went wrong!" });
});

export default app;
