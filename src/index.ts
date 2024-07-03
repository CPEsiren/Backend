import express, { Express, Request, Response } from "express";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import cors from "cors";
import mysql from "mysql2";

dotenv.config();

const app: Express = express();
const port: string | undefined = process.env.PORT;

if (!port) {
  console.error("PORT environment variable is not defined.");
  process.exit(1);
}

app.use(cors());
app.use(bodyParser.json());

const db = mysql.createPool({
  connectionLimit: 10,
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || "16838"),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

db.getConnection((err: any, connection: { release: () => void }) => {
  if (err) {
    console.error("Error connecting to the database:", err);
    return;
  }
  if (connection) connection.release();
  console.log("Connected to the database");
});

app.get("/", (req: Request, res: Response) => {
  res.send("Our Server");
});

app.get("/api/getUsers", (req: Request, res: Response) => {
  db.query("SELECT * FROM Users", (err: any, users: any) => {
    if (err) {
      console.error("Error fetching users:", err);
      res.status(500).json({ error: "Internal Server Error", details: err });
      return;
    }
    res.json(users);
  });
});

app.use((err: any, req: Request, res: Response, next: any) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Something went wrong!", details: err });
});

app.listen(parseInt(port), () => {
  console.log(`Backend started at port: ${port}.`);
});
