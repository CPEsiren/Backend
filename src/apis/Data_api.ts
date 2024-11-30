// import { fetchAndStoreSnmpData } from "../services/snmpService";
import { body, validationResult } from "express-validator";
import { Router, Request, Response } from "express";
import { Db, MongoClient, ObjectId } from "mongodb";
import dotenv from "dotenv";
import { createData, getAllData } from "../controllers/dataController";
import { fetchAndStoreSnmpData } from "../services/snmpService";

const router = Router();

dotenv.config();

const client = new MongoClient(`${process.env.Database_url}` || "");

router.get("/", getAllData);

router.post("/", createData);

router.get("/fetch", async (req: Request, res: Response) => {
  try {
    const results = await fetchAndStoreSnmpData();

    res.status(200).json({
      status: "success",
      message: "SNMP data fetched and stored successfully.",
      data: {
        totalResults: results.length,
        records: results,
      },
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Error fetching and storing SNMP data:", errorMessage);

    res.status(500).json({
      status: "error",
      message: "Failed to fetch and store SNMP data.",
      error: {
        message: errorMessage,
        ...(process.env.NODE_ENV === "development" && {
          stack: (error as Error).stack,
        }),
      },
    });
  }
});

export default router;
