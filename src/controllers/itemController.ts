import Item from "../models/Item";
import Host from "../models/Host";
import { Request, Response } from "express";

export const getAllItem = async (req: Request, res: Response) => {
  try {
    const item = await Item.find();

    if (item.length === 0) {
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
  } catch (err) {
    res.status(500).json({
      status: "error",
      message: "Error fetching item.",
      error: err instanceof Error ? err.message : "Unknown error",
    });
  }
};

export const createItem = async (req: Request, res: Response) => {
  try {
    const { host_id, name_item, oid, type, unit } = req.body;

    if (!host_id || !name_item || !oid || !type || !unit) {
      return res.status(400).json({
        status: "fail",
        message: "Missing required fields.",
        requiredFields: ["host_id", "name_item", "oid", "type", "unit"],
      });
    }

    const newItem = new Item({
      host_id,
      name_item,
      oid,
      type,
      unit,
    });
    await newItem.save();

    await Host.findByIdAndUpdate(host_id, {
      $push: { items: newItem._id },
    });

    res.status(201).json({
      status: "success",
      message: "Item created successfully.",
      data: newItem,
    });
  } catch (error) {
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
        message: "Item ID is required to delete a host.",
      });
    }

    const result = await Item.deleteOne({ _id: item_id });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        status: "fail",
        message: `No host found with ID: ${item_id}.`,
      });
    }

    await Host.updateMany({ items: item_id }, { $pull: { items: item_id } });

    res.status(200).json({
      status: "success",
      message: `Item with ID: ${item_id} deleted successfully.`,
    });
  } catch (err) {
    res.status(500).json({
      status: "error",
      message: "Failed to delete item.",
      error: err instanceof Error ? err.message : "Unknown error",
    });
  }
};
