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
    const collection = db.collection("Templates");

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

router.post("/createTemplate", async (req: Request, res: Response) => {
  try {
    const { template_id, name_template, description } = req.body;

    if (!template_id || !name_template || !description) {
      return res.status(400).json({ error: "Missing required fields." });
    }

    await client.connect();
    const db = client.db("CPE-siren");
    const collection = db.collection("Templates");

    const result = await collection.insertOne({
      _id: template_id,
      name_template,
      description,
      createdAt: new Date().toLocaleString("th-TH", {
        timeZone: "Asia/Bangkok",
      }),
      updatedAt: new Date().toLocaleString("th-TH", {
        timeZone: "Asia/Bangkok",
      }),
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

router.delete("/deleteTemplate/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: "Missing required parameter: id" });
    }

    await client.connect();
    const db = client.db("CPE-siren");
    const collection = db.collection("Templates");

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
