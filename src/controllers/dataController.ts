import mongoose from "mongoose";
import Data from "../models/Data";
import Host from "../models/Host";
import Item from "../models/Item";
import { Request, Response } from "express";

export const getAllData = async (req: Request, res: Response) => {
  try {
    const data = await Data.aggregate([
      {
        $group: {
          _id: {
            host_id: "$metadata.host_id",
            item_id: "$metadata.item_id",
          },
          data: {
            $push: {
              timestamp: "$timestamp",
              value: "$value",
            },
          },
        },
      },
      {
        $group: {
          _id: "$_id.host_id",
          items: {
            $push: {
              item_id: "$_id.item_id",
              data: "$data",
            },
          },
        },
      },
    ]);

    await Data.populate(data, {
      path: "items.item_id",
      model: "Item",
      select: "_id name_item oid type unit",
    });

    await Data.populate(data, {
      path: "_id",
      model: "Host",
      select: "hostname",
    });

    if (!data.length) {
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

export const getData = async (req: Request, res: Response) => {
  const host_id = req.params.id;
  try {
    const data = await Data.aggregate([
      {
        $match: { "metadata.host_id": new mongoose.Types.ObjectId(host_id) },
      },
      {
        $group: {
          _id: {
            host_id: "$metadata.host_id",
            item_id: "$metadata.item_id",
          },
          data: {
            $push: {
              timestamp: "$timestamp",
              value: "$value",
            },
          },
        },
      },
      {
        $group: {
          _id: "$_id.host_id",
          items: {
            $push: {
              item_id: "$_id.item_id",
              data: "$data",
            },
          },
        },
      },
    ]);

    await Data.populate(data, {
      path: "items.item_id",
      model: "Item",
      select: "_id name_item oid type unit",
    });

    await Data.populate(data, {
      path: "_id",
      model: "Host",
      select: "hostname",
    });

    if (!data.length) {
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
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { value, timestamp, host_id, item_id } = req.body;

    if (!value || !timestamp || !host_id || !item_id) {
      return res.status(400).json({
        status: "fail",
        message: "Missing required fields.",
        requiredFields: ["value", "timestamp", "host_id", "item_id"],
      });
    }

    const [host, item] = await Promise.all([
      Host.findById(host_id).session(session),
      Item.findById(item_id).session(session),
    ]);

    if (!host || !item) {
      throw new Error(host ? "Item not found" : "Host not found");
    }

    const newData = new Data({
      value,
      timestamp,
      metadata: {
        host_id,
        item_id,
      },
    });

    await newData.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      status: "success",
      message: "Data created successfully.",
      data: newData,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    if (
      error instanceof Error &&
      (error.message === "Host not found" || error.message === "Item not found")
    ) {
      return res.status(404).json({
        status: "fail",
        message: error.message,
      });
    }

    res.status(500).json({
      status: "error",
      message: "Error creating data.",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
