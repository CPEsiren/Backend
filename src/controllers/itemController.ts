import Item from "../models/Item";
import Host from "../models/Host";
import { Request, Response } from "express";
import mongoose from "mongoose";
import { clearSchedule, scheduleItem } from "../services/schedulerService";
import { fetchInterfaceHost } from "../services/snmpService";

export const getAllItem = async (req: Request, res: Response) => {
  try {
    const item = await Item.find().lean().exec();

    if (!item.length) {
      return res.status(404).json({
        status: "fail",
        message: "No item found.",
      });
    }

    res.status(200).json({
      status: "success",
      message: "Item fetched successfully.",
      data: item,
    });
  } catch (error) {
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
    const { host_id, name_item, oid, type, unit, interval } = req.body;

    console.log(interval);

    if (!host_id || !name_item || !oid || !type || !unit) {
      return res.status(400).json({
        status: "fail",
        message: "Missing required fields.",
        requiredFields: ["host_id", "name_item", "oid", "type", "unit"],
      });
    }

    let intervalValue = interval;
    if (typeof intervalValue !== "number") {
      intervalValue = Number(intervalValue);
      if (isNaN(intervalValue) || intervalValue <= 0) {
        return res.status(400).json({
          status: "fail",
          message: "Interval must be a positive number.",
        });
      }
    }

    const newItem = new Item({
      host_id,
      name_item,
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

    res.status(201).json({
      status: "success",
      message: "Item created successfully.",
      data: newItem,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    if (error instanceof Error && error.message === "Host not found.") {
      return res.status(404).json({
        status: "fail",
        message: "Host not found.",
      });
    }

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

      res.status(200).json({
        status: "success",
        message: `Item with ID: ${item_id} deleted successfully.`,
      });
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  } catch (error) {
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

      res.status(200).json({
        status: "success",
        message: `Item with ID: ${item_id} updated successfully.`,
        data: updatedItem,
      });
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  } catch (error) {
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

    res.status(201).json({
      status: "success",
      data: interfaces,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    res.status(500).json({
      status: "error",
      message: "Failed to scan interfaces.",
      error: errorMessage,
    });
  }
};
