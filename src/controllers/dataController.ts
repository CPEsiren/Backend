import { Request, Response } from "express";
import Data from "../models/Data";
import mongoose from "mongoose";

export const getAllData = async (req: Request, res: Response) => {
  try {
    const data = await Data.aggregate([
      {
        $group: {
          _id: {
            host_id: "$metadata.host_id",
            item_id: "$metadata.item_id",
            isBandwidth: "$metadata.isBandwidth",
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
              isBandwidth: "$_id.isBandwidth",
              data: "$data",
            },
          },
        },
      },
    ]);

    await Data.populate(data, {
      path: "items.item_id",
      model: "Item",
      select: "_id item_name oid type unit",
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

export const getBetween = async (req: Request, res: Response) => {
  const { startTime, endTime, host_id } = req.query;

  if (!startTime || !endTime || !host_id) {
    return res.status(400).json({
      status: "fail",
      message: "Start time and end time are required.",
    });
  }

  try {
    const data = await Data.aggregate([
      {
        $match: {
          "metadata.host_id": new mongoose.Types.ObjectId(host_id as string),
          timestamp: {
            $gte: new Date(startTime as string),
            $lte: new Date(endTime as string),
          },
        },
      },
      {
        $group: {
          _id: {
            host_id: "$metadata.host_id",
            item_id: "$metadata.item_id",
            isBandwidth: "$metadata.isBandwidth",
          },
          data: {
            $push: {
              timestamp: "$timestamp",
              value: "$value",
            },
          },
          max_value: { $max: "$value" },
          min_value: { $min: "$value" },
          avg_value: { $avg: "$value" },
        },
      },
      {
        $group: {
          _id: "$_id.host_id",
          items: {
            $push: {
              item_id: "$_id.item_id",
              isBandwidth: "$_id.isBandwidth",
              max_value: "$max_value",
              min_value: "$min_value",
              avg_value: "$avg_value",
              data: "$data",
            },
          },
        },
      },
    ]);

    await Data.populate(data, {
      path: "items.item_id",
      model: "Item",
      select: "_id item_name oid type unit",
    });

    await Data.populate(data, {
      path: "_id",
      model: "Host",
      select: "hostname",
    });

    if (!data.length) {
      return res.status(404).json({
        status: "fail",
        message: "No data found between the specified times.",
        data: data,
      });
    }

    res.status(200).json({
      status: "success",
      message: "Data fetched successfully for the specified time range.",
      data: data,
    });
  } catch (err) {
    res.status(500).json({
      status: "error",
      message: "Error fetching data between times.",
      error: err instanceof Error ? err.message : "Unknown error",
    });
  }
};
