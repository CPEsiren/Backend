import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

const client = new MongoClient(process.env.Database_url || "");

export const connectDb = async () => {
  try {
    await client.connect();
    console.log("Connected to MongoDB");
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    throw error;
  }
};

export const getDb = () => {
  return client.db("CPE-siren");
};

export const closeDb = async () => {
  await client.close();
  console.log("MongoDB connection closed");
};
