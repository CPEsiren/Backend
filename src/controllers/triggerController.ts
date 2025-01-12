import { addLog } from "../services/logService";
import { Request, Response } from "express";
import Trigger from "../models/Trigger";

const getTrigger = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const trigger = await Trigger.findById(id);
    if (!trigger) {
      await addLog("WARNING", "Trigger not found", false);
      return res.status(404).json({ message: "Trigger not found" });
    }

    await addLog("INFO", "Trigger retrieved successfully", false);
    res.status(200).json(trigger);
  } catch (error) {
    await addLog("ERROR", `Error retrieving trigger: ${error}`, false);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getTriggers = async (req: Request, res: Response) => {
  try {
    const { severity, enabled } = req.query;

    const query: any = {};
    if (severity) query.severity = severity;
    if (enabled !== undefined) query.enabled = enabled === "true";

    const triggers = await Trigger.find(query);

    await addLog("INFO", "Triggers retrieved successfully", false);
    res.status(200).json({
      triggers,
    });
  } catch (error) {
    await addLog("ERROR", `Error retrieving triggers: ${error}`, false);
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
      await addLog("WARNING", "Missing required fields", false);
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Check if a trigger with the same name already exists
    const existingTrigger = await Trigger.findOne({ trigger_name, severity });
    if (existingTrigger) {
      await addLog(
        "WARNING",
        "Trigger with this name and severity already exists",
        false
      );
      return res.status(409).json({
        message: "Trigger with this name and severity already exists",
      });
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

    await addLog(
      "INFO",
      `Trigger [${newTrigger.trigger_name}] created successfully`,
      true
    );
    res.status(201).json({
      message: `Trigger [${newTrigger.trigger_name}] created successfully`,
      trigger: newTrigger,
    });
  } catch (error) {
    await addLog("ERROR", `Error creating trigger: ${error}`, false);
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
      await addLog("WARNING", "Trigger not found", false);
      return res.status(404).json({ message: "Trigger not found" });
    }

    // Update fields if they are provided
    if (name !== undefined) {
      // Check if the new name already exists (excluding the current trigger)
      const existingTrigger = await Trigger.findOne({ name, _id: { $ne: id } });
      if (existingTrigger) {
        await addLog("WARNING", "Trigger with this name already exists", false);
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
        await addLog("WARNING", "Invalid ComparisonOperator", false);
        return res.status(400).json({ message: "Invalid ComparisonOperator" });
      }
    }

    // Save the updated trigger
    await trigger.save();

    await addLog(
      "INFO",
      `Trigger [${trigger.trigger_name}] updated successfully`,
      true
    );
    res.status(200).json({
      message: `Trigger [${trigger.trigger_name}] updated successfully`,
      trigger,
    });
  } catch (error) {
    await addLog("ERROR", `Error updating trigger: ${error}`, false);
    res.status(500).json({ message: "Internal server error" });
  }
};

const deleteTrigger = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Find the trigger and delete it
    const trigger = await Trigger.findByIdAndDelete(id);

    if (!trigger) {
      await addLog("WARNING", "Trigger not found", false);
      return res.status(404).json({ message: "Trigger not found" });
    }

    await addLog(
      "INFO",
      `Trigger [${trigger.trigger_name}] deleted successfully`,
      true
    );
    res.status(200).json({ message: "Trigger deleted successfully" });
  } catch (error) {
    await addLog("ERROR", `Error deleting trigger: ${error}`, false);
    res.status(500).json({ message: "Internal server error" });
  }
};

export { createTrigger, updateTrigger, deleteTrigger, getTrigger, getTriggers };
