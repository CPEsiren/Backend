import { Router, Request, Response } from "express";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";

const router = Router();

dotenv.config();

const client = new MongoClient(`${process.env.Database_url}` || "");

router.get("/", async (req: Request, res: Response) => {
  try {
    await client.connect();
    const db = client.db("CPE-siren");
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
  } finally {
    // ปิดการเชื่อมต่อ
    await client.close();
  }
});

router.post("/createHistory", async (req: Request, res: Response) => {
  try {
    const { item_id, host_id } = req.body;

    if (!item_id || !host_id) {
      return res.status(400).json({ error: "Missing required fields." });
    }

    await client.connect();
    const db = client.db("CPE-siren");
    const collections = await db
      .listCollections({ name: "Histories" })
      .toArray();
    if (collections.length === 0) {
      await db.createCollection("Histories", {
        timeseries: {
          timeField: "timestamp",
          metaField: "metadata",
          granularity: "minutes",
        },
        expireAfterSeconds: 9000,
      });
    }
    const collection = db.collection("Histories");

    const result = await collection.insertOne({
      timestamp: new Date(),
      metadata: {
        item_id,
        host_id,
      },
      value: 20,
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
  } finally {
    await client.close();
  }
});

router.delete("/deleteItem/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: "Missing required parameter: id" });
    }

    await client.connect();
    const db = client.db("CPE-siren");
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
  } finally {
    await client.close();
  }
});

export default router;
