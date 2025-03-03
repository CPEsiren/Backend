import { Request, Response } from "express";
import Data from "../models/Data";
import mongoose from "mongoose";
import { isMoreThanOneDays } from "../middleware/Time";
import Trend from "../models/Trend";

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

    if (!data.length) {
      return res.status(404).json({
        status: "fail",
        message: "No data found.",
      });
    }

    await Data.populate(data, [
      {
        path: "items.item_id",
        model: "Item",
        select: "_id item_name oid type unit",
      },
      {
        path: "_id",
        model: "Host",
        select: "hostname",
      },
    ]);

    res.status(200).json({
      status: "success",
      message: "Data fetched successfully.",
      data: data,
    });
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).json({ status: "fail", message: "Internal server error" });
  }
};

export const getHostBetween = async (req: Request, res: Response) => {
  const { startTime, endTime, host_id } = req.query;

  const requiredFields = ["startTime", "endTime", "host_id"];
  const missingFields = requiredFields.filter((field) => !req.query[field]);

  if (missingFields.length > 0) {
    return res.status(400).json({
      status: "fail",
      message: "Missing required fields.",
      requiredFields: missingFields,
    });
  }

  try {
    const start = new Date(startTime as string);
    const end = new Date(endTime as string);

    let data;

    if (isMoreThanOneDays(start, end)) {
      data = await Trend.aggregate([
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
              },
            },
            max_value: { $push: "$max_value" },
            min_value: { $push: "$min_value" },
            avg_value: { $push: "$avg_value" },
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
    } else {
      data = await Data.aggregate([
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
                max_value: ["$max_value"],
                min_value: ["$min_value"],
                avg_value: ["$avg_value"],
                data: "$data",
              },
            },
          },
        },
      ]);
    }

    await Data.populate(data, [
      {
        path: "items.item_id",
        model: "Item",
        select: "_id item_name oid type unit",
      },
      {
        path: "_id",
        model: "Host",
        select: "hostname",
      },
    ]);

    if (!data.length) {
      return res.status(404).json({
        status: "fail",
        message: "No data found between the specified times.",
      });
    }

    res.status(200).json({
      status: "success",
      message: "Data fetched successfully for the specified time range.",
      data: data,
    });
  } catch (error) {
    console.error("Error fetching data between times:", error);
    res.status(500).json({ status: "fail", message: "Internal server error" });
  }
};

export const getItemBetween = async (req: Request, res: Response) => {
  const { startTime, endTime, item_id } = req.query;

  const requiredFields = ["startTime", "endTime", "item_id"];
  const missingFields = requiredFields.filter((field) => !req.query[field]);

  if (missingFields.length > 0) {
    return res.status(400).json({
      status: "fail",
      message: "Missing required fields.",
      requiredFields: missingFields,
    });
  }

  try {
    const data = await Data.aggregate([
      {
        $match: {
          "metadata.item_id": new mongoose.Types.ObjectId(item_id as string),
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

    await Data.populate(data, [
      {
        path: "items.item_id",
        model: "Item",
        select: "_id item_name oid type unit",
      },
      {
        path: "_id",
        model: "Host",
        select: "hostname",
      },
    ]);

    if (!data.length) {
      return res.status(404).json({
        status: "fail",
        message: "No data found between the specified times.",
      });
    }

    res.status(200).json({
      status: "success",
      message: "Data fetched successfully for the specified time range.",
      data: data,
    });
  } catch (error) {
    console.error("Error fetching data between times:", error);
    res.status(500).json({ status: "fail", message: error });
  }
};
