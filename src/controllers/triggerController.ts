import { Request, Response } from "express";
import Trigger from "../models/Trigger";
import Item from "../models/Item";
import mongoose from "mongoose";
import {
  parseExpressionDetailed,
  parseExpressionToItems,
} from "../services/parserService";
import Host from "../models/Host";

const getTrigger = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const trigger = await Trigger.findById(id);
    if (!trigger) {
      return res.status(404).json({ message: "Trigger not found" });
    }

    res.status(200).json(trigger);
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

const getTriggers = async (req: Request, res: Response) => {
  try {
    const data = await Trigger.aggregate([
      {
        $group: {
          _id: "$host_id",
          triggers: { $push: "$$ROOT" },
        },
      },
      {
        $project: {
          host_id: "$_id",
          triggers: 1,
          _id: 0,
        },
      },
    ]);

    await Host.populate(data, {
      path: "host_id",
      model: "Host",
      select: "hostname",
    });

    res.status(200).json({
      status: "success",
      data,
    });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

const createTrigger = async (req: Request, res: Response) => {
  try {
    const {
      trigger_name,
      host_id,
      severity,
      expression,
      ok_event_generation,
      recovery_expression,
      enabled,
    } = req.body;

    const requiredFields = [
      "trigger_name",
      "host_id",
      "severity",
      "expression",
      "ok_event_generation",
      "enabled",
    ];

    const missingFields = requiredFields.filter((field) => !req.body[field]);

    // Validate input
    if (missingFields.length > 0) {
      return res.status(400).json({
        status: "fail",
        message: "Missing required fields.",
        requiredFields: missingFields,
      });
    }

    const items: [string, mongoose.Types.ObjectId][] = [];
    const addedItemNames = new Set<string>();

    //parse expression
    const parsedItemsExp = new Set(parseExpressionToItems(expression));
    const logicExpression = parseExpressionDetailed(expression).map((item) => {
      if (Array.isArray(item) && item.length === 3) {
        return "false"; // แทนที่เงื่อนไขด้วย 'false'
      }
      return item[0].toLowerCase(); // คงค่า 'or' หรือ 'and' ไว้
    });
    if (recovery_expression) {
      const parsedRecoveryItems = parseExpressionToItems(recovery_expression);
      parsedRecoveryItems.forEach((item) => parsedItemsExp.add(item));
    }

    if (parsedItemsExp.size === 0) {
      return res.status(400).json({
        status: "fail",
        message: "Invalid expression format",
      });
    }

    const logicRecoveryExpression = parseExpressionDetailed(
      recovery_expression
    ).map((item) => {
      if (Array.isArray(item) && item.length === 3) {
        return "false"; // แทนที่เงื่อนไขด้วย 'false'
      }
      return item[0].toLowerCase(); // คงค่า 'or' หรือ 'and' ไว้
    });

    for (const itemName of parsedItemsExp) {
      if (!addedItemNames.has(itemName)) {
        const item = await Item.findOne({ item_name: itemName });
        if (item) {
          items.push([itemName, item._id]);
          addedItemNames.add(itemName);
        }
      }
    }

    // Create new trigger
    const newTrigger = new Trigger({
      trigger_name,
      host_id,
      severity,
      expression,
      logicExpression,
      items,
      ok_event_generation,
      recovery_expression,
      logicRecoveryExpression,
      enabled,
    });

    // Save the trigger
    await newTrigger.save();

    res.status(201).json({
      message: `Trigger [${newTrigger.trigger_name}] created successfully`,
      trigger: newTrigger,
    });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

const updateTrigger = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      trigger_name,
      severity,
      expression,
      recovery_expression,
      ok_event_generation,
      enabled,
    } = req.body;

    const trigger = await Trigger.findByIdAndUpdate(id, {
      trigger_name,
      severity,
      expression,
      recovery_expression,
      ok_event_generation,
      enabled,
    });

    res.status(200).json({
      status: "success",
      message: `Trigger [${id}] updated successfully`,
      trigger,
    });
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: "Internal server error",
    });
  }
};

const deleteTrigger = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Find the trigger and delete it
    const trigger = await Trigger.findByIdAndDelete(id);

    if (!trigger) {
      return res.status(404).json({ message: "Trigger not found" });
    }

    res.status(200).json({ message: "Trigger deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

export { createTrigger, updateTrigger, deleteTrigger, getTrigger, getTriggers };
