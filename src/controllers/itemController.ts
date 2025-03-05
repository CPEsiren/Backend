import { clearSchedule, scheduleItem } from "../services/schedulerService";
import { fetchInterfaceHost } from "../services/snmpService";
import { Request, Response } from "express";
import Item from "../models/Item";
import Host from "../models/Host";
import Data from "../models/Data";
import mongoose from "mongoose";
import Trend from "../models/Trend";
import { createActivityLog } from "./LogUserController";
import Trigger from "../models/Trigger";

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
    console.error("Error fetching item.:", error);
    res.status(500).json({ status: "fail", message: error });
  }
};

export const createItem = async (req: Request, res: Response) => {
  try {
    const { host_id, item_name, oid, type, unit, interval } = req.body;

    const requiredFields = ["host_id", "item_name", "oid", "type", "unit"];
    const missingFields = requiredFields.filter((field) => !req.body[field]);
    if (missingFields.length > 0) {
      return res.status(400).json({
        status: "fail",
        message: "Missing required fields.",
        missingFields,
      });
    }

    if (!mongoose.Types.ObjectId.isValid(host_id)) {
      return res.status(400).json({
        status: "fail",
        message: "Invalid host ID format.",
      });
    }

    const intervalValue = Number(interval);
    if (isNaN(intervalValue) || intervalValue <= 0) {
      return res.status(400).json({
        status: "fail",
        message: "Interval must be a positive number.",
      });
    }

    const newItem = new Item({
      host_id,
      item_name,
      oid,
      type: type.toLowerCase(),
      unit,
      interval: intervalValue,
    });
    await newItem.save();

    const updatedHost = await Host.findByIdAndUpdate(
      host_id,
      { $push: { items: newItem._id } },
      { new: true }
    );

    if (!updatedHost) {
      return res.status(404).json({
        status: "fail",
        message: "Host not found.",
      });
    }

    scheduleItem(newItem);
    // Log activity
    const username = req.body.userName || "system";
    const role = req.body.userRole || "system";
    await createActivityLog(
      username,
      role,
      `Created item:${item_name} of [${updatedHost.hostname}]`
    );

    res.status(201).json({
      status: "success",
      message: `Item [${newItem.item_name}] of host [${updatedHost.hostname}] created successfully.`,
      data: newItem,
    });
  } catch (error) {
    await Item.findByIdAndDelete({
      host_id: req.body.host_id,
      item_name: req.body.item_name,
      oid: req.body.oid,
      type: req.body.type.toLowerCase(),
      unit: req.body.unit,
    });
    console.error("Error creating item: ", error);
    res.status(500).json({ status: "fail", message: error });
  }
};

export const deleteItem = async (req: Request, res: Response) => {
  try {
    const item_id = req.params.id;
    const item_name = req.params.itemToDelete_name;

    if (!mongoose.Types.ObjectId.isValid(item_id)) {
      return res.status(400).json({
        status: "fail",
        message: "Invalid item ID format.",
      });
    }

    try {
      const item = await Item.findById(item_id);
      const trigger = await Trigger.find({
        items: {
          $elemMatch: { $eq: [item?.item_name, item?._id] },
        },
      });

      if (trigger.length > 0) {
        const trigger_name = trigger.map((trigger) => trigger.trigger_name);
        return res.status(400).json({
          status: "fail",
          message: `Item [${item?.item_name}] is used in trigger [${trigger_name}]`,
        });
      }

      const deletedItem = await Item.findByIdAndDelete(item_id);

      if (!deletedItem) {
        return res.status(404).json({
          status: "fail",
          message: `No item found with ID: ${item_id}`,
        });
      }

      await Host.updateOne(
        { _id: deletedItem.host_id },
        { $pull: { items: item_id } }
      );

      await Promise.all([
        Data.deleteMany({
          "metadata.item_id": new mongoose.Types.ObjectId(item_id),
        }),
        Trend.deleteMany({
          "metadata.item_id": new mongoose.Types.ObjectId(item_id),
        }),
      ]);

      clearSchedule(item_id);

      const host = await Host.findById(deletedItem.host_id)
        .select("hostname")
        .lean();

      // Log activity
      const username = req.body.userName || "system";
      const role = req.body.userRole || "system";
      await createActivityLog(
        username,
        role,
        `Deleted item:${deletedItem.item_name}`
      );

      res.status(200).json({
        status: "success",
        message: `Item with [${deletedItem.item_name}] of host [${host?.hostname}] deleted successfully.`,
      });
    } catch (error) {
      console.error("Error fetching data between times:", error);
      res.status(500).json({ status: "fail", message: error });
    }
  } catch (error) {
    console.error("Error delete item: ", error);
    res.status(500).json({ status: "fail", message: error });
  }
};

export const updateItem = async (req: Request, res: Response) => {
  try {
    const item_id = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(item_id)) {
      return res.status(400).json({
        status: "fail",
        message: "Invalid item ID format.",
      });
    }
    // Get the original host data for logging purposes
    const originalItem: any = await Item.findById(item_id).lean();
    if (!originalItem) {
      return res.status(404).json({
        status: "fail",
        message: `No item found with ID: ${item_id}`,
      });
    }

    const updateFields = ["item_name", "oid", "type", "unit", "interval"];
    const updateData: { [key: string]: any } = {};

    updateFields.forEach((field) => {
      if (field in req.body) {
        updateData[field] = req.body[field];
      }
    });

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        status: "fail",
        message: "No valid update fields provided.",
      });
    }

    if ("type" in updateData) {
      updateData.type = updateData.type.toLowerCase();
    }

    if ("interval" in updateData) {
      const intervalValue = Number(updateData.interval);
      if (isNaN(intervalValue) || intervalValue <= 0) {
        return res.status(400).json({
          status: "fail",
          message: "Interval must be a positive number.",
        });
      }
      updateData.interval = intervalValue;
    }

    const updatedItem = await Item.findByIdAndUpdate(item_id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!updatedItem) {
      return res.status(404).json({
        status: "fail",
        message: `No item found with ID: ${item_id}`,
      });
    }

    const host = await Host.findById(updatedItem.host_id)
      .select("hostname")
      .lean();

    await scheduleItem(updatedItem);

    // Generate the change summary for logging
    const changes = Object.keys(updateData)
      .filter(
        (key) =>
          JSON.stringify(updateData[key]) !==
          JSON.stringify(originalItem[key as keyof typeof originalItem])
      )
      .map(
        (key) =>
          `${key}: ${JSON.stringify(
            originalItem[key as keyof typeof originalItem]
          )} → ${JSON.stringify(updateData[key])}`
      )
      .join(", ");

    // Log activity
    const username = req.body.userName || "system";
    const role = req.body.userRole || "system";
    await createActivityLog(
      username,
      role,
      `Updated host: ${updatedItem.item_name}. Changes: ${changes}`
    );

    res.status(200).json({
      status: "success",
      message: `Item [${updatedItem.item_name}] of host [${
        host?.hostname || "Unknown"
      }] updated successfully.`,
      data: updatedItem,
    });
  } catch (error) {
    console.error("Failed to update item:", error);
    res.status(500).json({ status: "fail", message: error });
  }
};

export const scanInterface = async (req: Request, res: Response) => {
  try {
    const { ip_address, port, version, community, authenV3 } = req.body;

    const requiredFields = ["ip_address", "port", "version"];
    const missingFields = requiredFields.filter((field) => !req.body[field]);

    if (missingFields.length > 0) {
      return res.status(400).json({
        status: "fail",
        message: "Missing required fields.",
        requiredFields: missingFields,
      });
    }

    if (["SNMPv1", "SNMPv2c"].includes(version) && !community) {
      return res.status(400).json({
        status: "fail",
        message: "SNMP community is required for SNMPv1 and SNMPv2c.",
      });
    }

    if (version === "SNMPv3" && !authenV3) {
      return res.status(400).json({
        status: "fail",
        message: "Authentication details are required for SNMPv3.",
      });
    }

    const interfaces = await fetchInterfaceHost(
      ip_address,
      community,
      port,
      version,
      authenV3
    );

    res.status(201).json({
      status: "success",
      message: "Interfaces scanned successfully.",
      data: interfaces,
    });
  } catch (error) {
    console.error("Failed to scan interfaces:", error);
    res.status(500).json({ status: "fail", message: error });
  }
};
