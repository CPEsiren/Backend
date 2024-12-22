// FILEPATH: /d:/CPE-Siren/Backend/src/controllers/triggerController.ts

import { Request, Response } from "express";
import Trigger from "../models/Trigger";

const getTrigger = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const trigger = await Trigger.findById(id);
    if (!trigger) {
      return res.status(404).json({ message: "Trigger not found" });
    }

    res.json(trigger);
  } catch (error) {
    console.error("Error retrieving trigger:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getTriggers = async (req: Request, res: Response) => {
  try {
    const { severity, enabled, limit = 10, page = 1 } = req.query;

    const query: any = {};
    if (severity) query.severity = severity;
    if (enabled !== undefined) query.enabled = enabled === "true";

    const skip = (Number(page) - 1) * Number(limit);

    const triggers = await Trigger.find(query)
      .sort({ name: 1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Trigger.countDocuments(query);

    res.json({
      triggers,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    });
  } catch (error) {
    console.error("Error retrieving triggers:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const createTrigger = async (req: Request, res: Response) => {
  try {
    const {
      trigger_name,
      host_id,
      item_id,
      ComparisonOperator,
      valuetrigger,
      severity,
    } = req.body;

    // Validate input
    if (
      !trigger_name ||
      !host_id ||
      !item_id ||
      !ComparisonOperator ||
      valuetrigger === undefined ||
      !severity
    ) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Check if a trigger with the same name already exists
    const existingTrigger = await Trigger.findOne({ trigger_name, severity });
    if (existingTrigger) {
      return res
        .status(409)
        .json({ message: "Trigger with this name already exists" });
    }

    // Create new trigger
    const newTrigger = new Trigger({
      trigger_name,
      host_id,
      item_id,
      ComparisonOperator,
      valuetrigger,
      severity,
      enabled: true, // Default to enabled
    });

    // Save the trigger
    await newTrigger.save();

    res.status(201).json({
      message: "Trigger created successfully",
      trigger: newTrigger,
    });
  } catch (error) {
    console.error("Error creating trigger:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const updateTrigger = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      name,
      host_id,
      item_id,
      ComparisonOperator,
      valuetrigger,
      severity,
      enabled,
    } = req.body;

    // Find the trigger
    const trigger = await Trigger.findById(id);
    if (!trigger) {
      return res.status(404).json({ message: "Trigger not found" });
    }

    // Update fields if they are provided
    if (name !== undefined) {
      // Check if the new name already exists (excluding the current trigger)
      const existingTrigger = await Trigger.findOne({ name, _id: { $ne: id } });
      if (existingTrigger) {
        return res
          .status(409)
          .json({ message: "Trigger with this name already exists" });
      }
      trigger.trigger_name = name;
    }
    if (host_id !== undefined) trigger.host_id = host_id;
    if (item_id !== undefined) trigger.item_id = item_id;
    if (ComparisonOperator !== undefined)
      trigger.ComparisonOperator = ComparisonOperator;
    if (valuetrigger !== undefined) trigger.valuetrigger = valuetrigger;
    if (severity !== undefined) trigger.severity = severity;
    if (enabled !== undefined) trigger.enabled = enabled;

    // Validate ComparisonOperator if it's being updated
    if (ComparisonOperator !== undefined) {
      const validOperators = ["<", "<=", "=", ">=", ">", "!="];
      if (!validOperators.includes(ComparisonOperator)) {
        return res.status(400).json({ message: "Invalid ComparisonOperator" });
      }
    }

    // Save the updated trigger
    await trigger.save();

    res.json({
      message: "Trigger updated successfully",
      trigger,
    });
  } catch (error) {
    console.error("Error updating trigger:", error);
    res.status(500).json({ message: "Internal server error" });
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

    res.json({ message: "Trigger deleted successfully" });
  } catch (error) {
    console.error("Error deleting trigger:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export { createTrigger, updateTrigger, deleteTrigger, getTrigger, getTriggers };
