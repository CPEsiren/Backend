import { Request, Response } from "express";
import Trigger from "../models/Trigger";
import Item from "../models/Item";
import mongoose from "mongoose";
import {
  parseExpressionDetailed,
  parseExpressionToItems,
} from "../services/parserService";
import Host from "../models/Host";
import { createActivityLog } from "./LogUserController";

const getTrigger = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: "fail",
        message: "Invalid trigger ID format.",
      });
    }

    const trigger = await Trigger.findById(id).select("-__v").lean().exec();
    if (!trigger) {
      return res.status(404).json({
        status: "fail",
        message: "Trigger not found",
      });
    }

    res.status(200).json({
      status: "success",
      data: trigger,
    });
  } catch (error) {
    console.error("Error fetching trigger: ", error);
    res.status(500).json({ status: "fail", message: error });
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
      select: "hostname -_id",
    });

    if (data.length === 0) {
      return res.status(404).json({
        status: "fail",
        message: "No triggers found",
      });
    }

    res.status(200).json({
      status: "success",
      data,
    });
  } catch (error) {
    console.error("Error fetching triggers: ", error);
    res.status(500).json({ status: "fail", message: error });
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
      expressionPart,
      expressionRecoveryPart,
      thresholdDuration,
    } = req.body;

    const requiredFields = [
      "trigger_name",
      "host_id",
      "severity",
      "expression",
      "ok_event_generation",
      "expressionPart",
      "expressionRecoveryPart",
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

    if (expressionPart.duration) {
      const expressionDuration = expressionPart.duration;
      const durationRegex = /^\d+[mhd]$/;

      if (!durationRegex.test(expressionDuration)) {
        return res.status(400).json({
          status: "fail",
          message:
            "Invalid duration format. Must be a number followed by m, h, or d (e.g., 15m, 2h, 3d)",
        });
      }
    }

    if (expressionRecoveryPart.duration) {
      const expressionDuration = expressionRecoveryPart.duration;
      const durationRegex = /^\d+[mhd]$/;

      if (!durationRegex.test(expressionDuration)) {
        return res.status(400).json({
          status: "fail",
          message:
            "Invalid duration format. Must be a number followed by m, h, or d (e.g., 15m, 2h, 3d)",
        });
      }
    }

    const items: [string, mongoose.Types.ObjectId, number][] = [];
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

    let type = "item";

    for (const itemName of parsedItemsExp) {
      if (!addedItemNames.has(itemName)) {
        const item = await Item.findOne({
          item_name: itemName,
          host_id: host_id,
        });
        if (item) {
          items.push([itemName, item._id, 0]);
          addedItemNames.add(itemName);
        } else {
          if (
            !(
              itemName.includes("Device Status") ||
              itemName.includes("Interface Operation Status") ||
              itemName.includes("Interface Admin Status")
            )
          ) {
            return res.status(400).json({
              status: "fail",
              message: `Item [${itemName}] not found`,
            });
          } else {
            type = "host";
          }
        }
      }
    }

    // Create new trigger
    const newTrigger = new Trigger({
      trigger_name,
      type,
      host_id,
      severity,
      expression,
      logicExpression,
      items,
      ok_event_generation,
      recovery_expression,
      logicRecoveryExpression,
      enabled,
      expressionPart,
      expressionRecoveryPart,
      thresholdDuration,
    });

    // Save the trigger
    await newTrigger.save();

    // Log activity
    const username = req.body.userName || "system";
    const role = req.body.userRole || "system";
    await createActivityLog(username, role, `Created Trigger: ${trigger_name}`);

    res.status(201).json({
      message: `Trigger [${newTrigger.trigger_name}] created successfully`,
      trigger: newTrigger,
    });
  } catch (error) {
    await Trigger.findOneAndDelete({
      trigger_name: req.body.trigger_name,
      type: req.body.type,
      host_id: req.body.host_id,
      severity: req.body.severity,
    });
    console.error("Error creating trigger:", error);
    res.status(500).json({ status: "fail", message: `${error}` });
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
      expressionPart,
      expressionRecoveryPart,
      thresholdDuration,
    } = req.body;

    if (expressionPart.duration) {
      const expressionDuration = expressionPart.duration;
      const durationRegex = /^\d+[mhd]$/;

      if (!durationRegex.test(expressionDuration)) {
        return res.status(400).json({
          status: "fail",
          message:
            "Invalid duration format. Must be a number followed by m, h, or d (e.g., 15m, 2h, 3d)",
        });
      }
    }

    if (expressionRecoveryPart.duration) {
      const expressionDuration = expressionRecoveryPart.duration;
      const durationRegex = /^\d+[mhd]$/;

      if (!durationRegex.test(expressionDuration)) {
        return res.status(400).json({
          status: "fail",
          message:
            "Invalid duration format. Must be a number followed by m, h, or d (e.g., 15m, 2h, 3d)",
        });
      }
    }

    const items: [string, mongoose.Types.ObjectId, number][] = [];
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

    const triggerHost = await Trigger.findById(id).select("host_id").lean();

    let type = "item";

    for (const itemName of parsedItemsExp) {
      if (!addedItemNames.has(itemName)) {
        const item = await Item.findOne({
          item_name: itemName,
          host_id: triggerHost?.host_id,
        });
        if (item) {
          items.push([itemName, item._id, 0]);
          addedItemNames.add(itemName);
        } else {
          if (
            !(
              itemName.includes("Device Status") ||
              itemName.includes("Interface Operation Status") ||
              itemName.includes("Interface Admin Status")
            )
          ) {
            return res.status(400).json({
              status: "fail",
              message: `Item [${itemName}] not found`,
            });
          } else {
            type = "host";
          }
        }
      }
    }

    const trigger = await Trigger.findByIdAndUpdate(id, {
      trigger_name,
      type,
      severity,
      expression,
      logicExpression,
      items,
      ok_event_generation,
      recovery_expression,
      logicRecoveryExpression,
      enabled,
      expressionPart,
      expressionRecoveryPart,
      thresholdDuration,
    });

    // Log activity
    const username = req.body.userName || "system";
    const role = req.body.userRole || "system";
    await createActivityLog(username, role, `Updated Trigger: ${trigger_name}`);

    res.status(200).json({
      status: "success",
      message: `Trigger [${id}] updated successfully`,
      trigger,
    });
  } catch (error) {
    console.error("Error updating trigger: ", error);
    res.status(500).json({ status: "fail", message: error });
  }
};

const deleteTrigger = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deletetriggername = req.body.trigger_name;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: "fail",
        message: "Invalid trigger ID format.",
      });
    }

    const deletedTrigger = await Trigger.findByIdAndDelete(id).lean();

    if (!deletedTrigger) {
      return res.status(404).json({
        status: "fail",
        message: "Trigger not found",
      });
    }

    // Log activity
    const username = req.body.userName || "system";
    const role = req.body.userRole || "system";
    await createActivityLog(
      username,
      role,
      `Deleted Trigger: ${deletetriggername}`
    );
    res.status(200).json({
      status: "success",
      message: `Trigger [${deletedTrigger.trigger_name}] deleted successfully`,
      data: { trigger: deletedTrigger },
    });
  } catch (error) {
    console.error("Error deleting trigger:", error);
    res.status(500).json({ status: "fail", message: error });
  }
};

export { createTrigger, updateTrigger, deleteTrigger, getTrigger, getTriggers };
