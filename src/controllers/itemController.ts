import { clearSchedule, scheduleItem } from "../services/schedulerService";
import { fetchInterfaceHost } from "../services/snmpService";
import { addLog } from "../services/logService";
import { Request, Response } from "express";
import Item from "../models/Item";
import Host from "../models/Host";
import Data from "../models/Data";
import mongoose from "mongoose";

export const getAllItem = async (req: Request, res: Response) => {
  try {
    const item = await Item.find().lean().exec();

    if (!item.length) {
      await addLog("WARNING", "No item found.", false);
      return res.status(404).json({
        status: "fail",
        message: "No item found.",
      });
    }

    await addLog("INFO", "Item fetched successfully.", false);
    res.status(200).json({
      status: "success",
      message: "Item fetched successfully.",
      data: item,
    });
  } catch (error) {
    await addLog("ERROR", `Error fetching item: ${error}`, false);
    res.status(500).json({
      status: "error",
      message: "Error fetching item.",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const createItem = async (req: Request, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { host_id, item_name, oid, type, unit, interval } = req.body;

    if (!host_id || !item_name || !oid || !type || !unit) {
      await addLog("WARNING", "Missing required fields.", false);
      return res.status(400).json({
        status: "fail",
        message: "Missing required fields.",
        requiredFields: ["host_id", "item_name", "oid", "type", "unit"],
      });
    }

    let intervalValue = interval;
    if (typeof intervalValue !== "number") {
      intervalValue = Number(intervalValue);
      if (isNaN(intervalValue) || intervalValue <= 0) {
        await addLog("WARNING", "Interval must be a positive number.", false);
        return res.status(400).json({
          status: "fail",
          message: "Interval must be a positive number.",
        });
      }
    }

    const newItem = new Item({
      host_id,
      item_name,
      oid,
      type,
      unit,
      interval: intervalValue,
    });
    await newItem.save({ session });

    scheduleItem(newItem);

    const updatedHost = await Host.findByIdAndUpdate(
      host_id,
      { $push: { items: newItem._id } },
      { new: true, session }
    );

    if (!updatedHost) {
      throw new Error("Host not found.");
    }

    await session.commitTransaction();
    session.endSession();

    await addLog(
      "INFO",
      `Item [${newItem.item_name}] of host [${updatedHost.hostname}] created successfully.`,
      true
    );
    res.status(201).json({
      status: "success",
      message: `Item [${newItem.item_name}] of host [${updatedHost.hostname}] created successfully.`,
      data: newItem,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    if (error instanceof Error && error.message === "Host not found.") {
      await addLog("ERROR", "Host not found.", false);
      return res.status(404).json({
        status: "fail",
        message: "Host not found.",
      });
    }

    await addLog("ERROR", `Error creating item: ${error}`, false);
    res.status(500).json({
      status: "error",
      message: "Error creating item.",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const deleteItem = async (req: Request, res: Response) => {
  try {
    const item_id = req.params.id;

    if (!item_id) {
      return res.status(400).json({
        status: "fail",
        message: "Item ID is required to delete an item.",
      });
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const deletedItem = await Item.findByIdAndDelete(item_id).session(
        session
      );

      if (!deletedItem) {
        throw new Error(`No item found with ID: ${item_id}`);
      }

      clearSchedule(item_id);

      await Host.updateMany(
        { items: item_id },
        { $pull: { items: item_id } }
      ).session(session);

      await session.commitTransaction();
      session.endSession();

      await Data.deleteMany({
        "metadata.item_id": new mongoose.Types.ObjectId(item_id),
      });

      const host = await Host.findById(deletedItem.host_id);

      await addLog(
        "INFO",
        `Item with [${deletedItem.item_name}] of host [${host?.hostname}] deleted successfully.`,
        true
      );
      res.status(200).json({
        status: "success",
        message: `Item with [${deletedItem.item_name}] of host [${host?.hostname}] deleted successfully.`,
      });
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  } catch (error) {
    await addLog("ERROR", `Failed to delete item: ${error}`, false);
    res.status(500).json({
      status: "error",
      message: "Failed to delete item.",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const updateItem = async (req: Request, res: Response) => {
  try {
    const item_id = req.params.id;

    if (!item_id) {
      await addLog("WARNING", "Invalid item ID.", false);
      return res.status(400).json({
        status: "fail",
        message: "Item ID is required to update an item.",
      });
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const updatedItem = await Item.findByIdAndUpdate(
        item_id,
        { $set: req.body },
        { new: true, session }
      );

      if (!updatedItem) {
        throw new Error(`No item found with ID: ${item_id}`);
      }

      await session.commitTransaction();
      session.endSession();

      const host = await Host.findById(updatedItem.host_id);

      await addLog(
        "INFO",
        `Item with ID: [${updatedItem.item_name}] of host [${host?.hostname}] updated successfully.`,
        true
      );
      res.status(200).json({
        status: "success",
        message: `Item with ID: [${updatedItem.item_name}] of host [${host?.hostname}] updated successfully.`,
        data: updatedItem,
      });
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  } catch (error) {
    await addLog("ERROR", `Failed to update item: ${error}`, false);
    res.status(500).json({
      status: "error",
      message: "Failed to update item.",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const scanInterface = async (req: Request, res: Response) => {
  try {
    const { ip_address, port, version, community } = req.query;

    if (!ip_address || !community || !port || !version) {
      await addLog("WARNING", "Missing required fields.", false);
      return res.status(400).json({
        status: "fail",
        message: "Missing required fields.",
        requiredFields: ["ip_address", "community", "port", "version"],
      });
    }

    const interfaces = await fetchInterfaceHost(
      ip_address as string,
      community as string,
      parseInt(port as string, 10),
      version as string
    );

    await addLog("INFO", "Interfaces scanned successfully.", false);
    res.status(201).json({
      status: "success",
      data: interfaces,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";

    await addLog("ERROR", `Failed to scan interfaces: ${errorMessage}`, false);
    res.status(500).json({
      status: "error",
      message: "Failed to scan interfaces.",
      error: errorMessage,
    });
  }
};
