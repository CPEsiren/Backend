import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config();

const url = process.env.Database_url || "";

export const connectDb = async () => {
  try {
    await mongoose.connect(url);
    console.log("MongoDB connected successfully.");
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    throw error;
  }
};
