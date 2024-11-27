import Data from "../models/Data";
import { Request, Response } from "express";

export const getAllData = async (req: Request, res: Response) => {
  try {
    const data = await Data.find();

    if (data.length === 0) {
      return res.status(404).json({
        status: "fail",
        message: "No data found.",
      });
    }
    res.status(200).json({
      status: "success",
      message: "Data fetched successfully.",
      data: data,
    });
  } catch (err) {
    res.status(500).json({
      status: "error",
      message: "Error fetching data.",
      error: err instanceof Error ? err.message : "Unknown error",
    });
  }
};

export const createData = async (req: Request, res: Response) => {
  try {
    const { value, timestamp, host_id, item_id } = req.body;

    if (!value || !timestamp || !host_id || !item_id) {
      return res.status(400).json({
        status: "fail",
        message: "Missing required fields.",
        requiredFields: [
          "value",
          "timestamp",
          "host_id",
          "hostname",
          "item_id",
          "item_name",
        ],
      });
    }

    const newData = new Data({
      value,
      timestamp,
      metadata: { host_id, item_id },
    });
    await newData.save();
    res.status(201).json({
      status: "success",
      message: "Data created successfully.",
      data: newData,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Error creating data.",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
