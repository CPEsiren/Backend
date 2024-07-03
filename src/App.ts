// src/app.ts
import express, { Express, Request, Response, NextFunction } from "express";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import cors from "cors";
import User from "./routes/Userapi";
import Device from "./routes/Deviceapi";

dotenv.config();

const app: Express = express();

app.use(cors());
app.use(bodyParser.json());

app.get("/", (req: Request, res: Response) => {
  res.send("Our Server");
});

app.use("/getUser", User);
app.use("/getDevice", Device);
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Something went wrong!", details: err });
});

export default app;
