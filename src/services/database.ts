import { addLog } from "./logService";
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const url = process.env.DATABASE_URL;

export const connectDb = async (): Promise<void> => {
  if (!url) {
    await addLog(
      "ERROR",
      "DATABASE_URL is not defined in the environment variables",
      false
    );
    throw new Error("DATABASE_URL is not defined in the environment variables");
  }

  try {
    await mongoose.connect(url);
    await addLog("INFO", "MongoDB connected successfully.", false);
    console.log("MongoDB connected successfully.");
  } catch (error) {
    throw error;
  }
};
