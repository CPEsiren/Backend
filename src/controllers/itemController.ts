import Item from "../models/Item";
import Host from "../models/Host";
import { Request, Response } from "express";
import mongoose from "mongoose";

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
    const { host_id, name_item, oid, type, unit } = req.body;

    if (!host_id || !name_item || !oid || !type || !unit) {
      return res.status(400).json({
        status: "fail",
        message: "Missing required fields.",
        requiredFields: ["host_id", "name_item", "oid", "type", "unit"],
      });
    }

    const newItem = new Item({ host_id, name_item, oid, type, unit });
    await newItem.save({ session });

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
    const item_id = req.query.id;

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
