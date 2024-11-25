import { fetchAndStoreSnmpData } from "../services/snmpService";
import { body, validationResult } from "express-validator";
import { Router, Request, Response } from "express";
import { getDb } from "../services/database";
import { MongoClient, ObjectId } from "mongodb";
import dotenv from "dotenv";

const router = Router();

dotenv.config();

const client = new MongoClient(`${process.env.Database_url}` || "");

router.get("/", async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const collection = db.collection("Histories");

    const data = await collection.find().toArray();
    res.status(200).json({
      message: "Data retrieved successfully.",
      data,
    });
  } catch (err) {
    console.error("Error fetching data:", err);

    res.status(500).json({
      error: "Failed to fetch data.",
      details: err instanceof Error ? err.message : "Unknown error",
    });
  }
});

router.post(
  "/createHistory",
  [
    body("item_id").notEmpty().withMessage("Item id is required"),
    body("host_id").notEmpty().withMessage("Host id is required"),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const data = req.body;
      const db = getDb();
      const collections = await db
        .listCollections({ name: "Histories" })
        .toArray();

      if (collections.length === 0) {
        await db.createCollection("Histories", {
          timeseries: {
            timeField: "timestamp",
            metaField: "metadata",
            granularity: "seconds",
          },
          expireAfterSeconds: 86400,
        });
      }
      const collection = db.collection("Histories");

      const result = await collection.insertOne({
        metadata: {
          ...data,
        },
        timestamp: new Date(),
        value: data.value || 20,
      });

      res.status(201).json({
        message: "Data added successfully.",
        data: result,
      });
    } catch (err) {
      console.error("Error fetching data:", err);

      res.status(500).json({
        error: "Failed to fetch data.",
        details: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }
);

router.delete("/deleteItem/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: "Missing required parameter: id" });
    }

    const db = getDb();
    const collection = db.collection("Items");

    const result = await collection.deleteOne({ _id: parseInt(id) as any });

    if (result.deletedCount === 0) {
      return res
        .status(404)
        .json({ error: "No data found with the specified id." });
    }

    res.status(200).json({
      message: "Data deleted successfully.",
    });
  } catch (err) {
    console.error("Error deleting data:", err);

    res.status(500).json({
      error: "Failed to delete data.",
      details: err instanceof Error ? err.message : "Unknown error",
    });
  }
});

router.get("/fetchAndStoreSnmpData", async (req: Request, res: Response) => {
  try {
    const results = await fetchAndStoreSnmpData();
    res.status(201).json({
      message: "SNMP data fetched and stored successfully.",
      data: results,
    });
  } catch (err) {
    console.error("Error fetching and storing SNMP data:", err);
    res.status(500).json({
      error: "Failed to fetch and store SNMP data.",
      details: err instanceof Error ? err.message : "Unknown error",
    });
  }
});

export default router;
