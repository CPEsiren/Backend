import { body, validationResult } from "express-validator";
import { Router, Request, Response } from "express";
import { getDb } from "../services/database";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";

const router = Router();

dotenv.config();

const client = new MongoClient(`${process.env.Database_url}` || "");

router.get("/", async (req: Request, res: Response) => {
  try {
    const db = getDb();
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
  }
});

router.post(
  "/createTemplate",
  [body("name_template").notEmpty().withMessage("Name template is required")],
  async (req: Request, res: Response) => {
    try {
      const data = req.body;

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const db = getDb();
      const collection = db.collection("Templates");

      const result = await collection.insertOne({
        ...data,
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
    }
  }
);

router.delete("/deleteTemplate/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: "Missing required parameter: id" });
    }

    const db = getDb();
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
  }
});

export default router;
