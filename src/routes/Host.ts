import { Router, Request, Response } from "express";
import { MongoClient, ObjectId } from "mongodb";
import dotenv from "dotenv";

const router = Router();

dotenv.config();

router.get("/");

const client = new MongoClient(`${process.env.Database_url}` || "");

router.get("/", async (req: Request, res: Response) => {
  try {
    await client.connect();
    const db = client.db("CPE-siren");
    const collection = db.collection("Host");

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

router.post("/add", async (req: Request, res: Response) => {
  try {
    const { hostname, templates, hostgroup, inface } = req.body;

    if (!hostname || !templates || !hostgroup || !inface) {
      return res.status(400).json({ error: "Missing required fields." });
    }

    await client.connect();
    const db = client.db("CPE-siren");
    const collection = db.collection("Host");

    const result = await collection.insertOne({
      hostname,
      templates,
      hostgroup,
      inface,
      createdAt: new Date().toLocaleString("th-TH", {
        timeZone: "Asia/Bangkok",
      }),
    });

    res.status(201).json({
      message: "Data added successfully.",
      data: result,
    });
  } catch (err) {
    console.error("Error adding data:", err);

    res.status(500).json({
      error: "Failed to add data.",
      details: err instanceof Error ? err.message : "Unknown error",
    });
  } finally {
    await client.close();
  }
});

router.delete("/delete/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: "Missing required parameter: id" });
    }

    await client.connect();
    const db = client.db("CPE-siren");
    const collection = db.collection("Host");

    const result = await collection.deleteOne({ _id: new ObjectId(id) });

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
