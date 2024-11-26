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
    const collection = db.collection("Items");

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
  "/createItem",
  [
    body("host_id").notEmpty().withMessage("Host id is required"),
    body("name_item").notEmpty().withMessage("Name item is required"),
    body("oid").notEmpty().withMessage("OID is required"),
    body("type").notEmpty().withMessage("Item type is required"),
    body("unit").notEmpty().withMessage("Item unit is required"),
    body("interval").notEmpty().withMessage("interval is required"),
    body("exp_history").notEmpty().withMessage("exp_history is required"),
    body("exp_trends").notEmpty().withMessage("exp_trends is required"),
  ],
  async (req: Request, res: Response) => {
    try {
      const data = req.body;

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const db = getDb();
      const collection = db.collection("Items");

      const result = await collection.insertOne({
        ...data,
        host_id: new ObjectId(data.host_id),
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

export default router;
