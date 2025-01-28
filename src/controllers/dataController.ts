import { addLog } from "../services/logService";
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
            item_type: "$metadata.item_type",
          },
          data: {
            $push: {
              timestamp: "$timestamp",
              value: "$value",
              Simple_change: "$Simple_change",
              Change_per_second: "$Change_per_second",
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
              item_type: "$_id.item_type",
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
      await addLog("WARNING", "No data found.", false);
      return res.status(404).json({
        status: "fail",
        message: "No data found.",
      });
    }

    await addLog("INFO", "Data fetched successfully.", false);
    res.status(200).json({
      status: "success",
      message: "Data fetched successfully.",
      data: data,
    });
  } catch (err) {
    await addLog("ERROR", `Error fetching data: ${err}`, false);
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
              Simple_change: "$Simple_change",
              Change_per_second: "$Change_per_second",
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
      await addLog("WARNING", "No data found.", false);
      return res.status(404).json({
        status: "fail",
        message: "No data found.",
      });
    }

    await addLog("INFO", "Data fetched successfully.", false);
    res.status(200).json({
      status: "success",
      message: "Data fetched successfully.",
      data: data,
    });
  } catch (err) {
    await addLog("ERROR", `Error fetching data: ${err}`, false);
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
            item_type: "$metadata.item_type",
          },
          data: {
            $push: {
              timestamp: "$timestamp",
              value: "$value",
              Simple_change: "$Simple_change",
              Change_per_second: "$Change_per_second",
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
              item_type: "$_id.item_type",
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
      await addLog(
        "WARNING",
        "No data found between the specified times.",
        false
      );
      return res.status(404).json({
        status: "fail",
        message: "No data found between the specified times.",
        data: data,
      });
    }

    await addLog(
      "INFO",
      "Data fetched successfully for the specified time range.",
      false
    );
    res.status(200).json({
      status: "success",
      message: "Data fetched successfully for the specified time range.",
      data: data,
    });
  } catch (err) {
    await addLog("ERROR", `Error fetching data between times: ${err}`, false);
    res.status(500).json({
      status: "error",
      message: "Error fetching data between times.",
      error: err instanceof Error ? err.message : "Unknown error",
    });
  }
};
