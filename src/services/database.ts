import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const url = process.env.DATABASE_URL;

export const connectDb = async (): Promise<void> => {
  if (!url) {
    console.error(`DATABASE_URL is not defined`);
    process.exit(1);
  }

  try {
    await mongoose.connect(url, {
      dbName: "CPE-Siren", // Specify the database name here
    });
    console.log("MongoDB connected successfully.");
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error}`);
    process.exit(1);
  }
};
