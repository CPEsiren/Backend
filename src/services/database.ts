import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const url = process.env.DATABASE_URL;

export const connectDb = async (): Promise<void> => {
  if (!url) {
    throw new Error("DATABASE_URL is not defined in the environment variables");
  }

  try {
    await mongoose.connect(url);
    console.log("MongoDB connected successfully.");
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    throw error;
  }
};
