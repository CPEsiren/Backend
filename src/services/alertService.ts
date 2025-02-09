import { sendEmail } from "../services/mailService";
import { sendLine } from "../services/lineService";
import { IMedia } from "../models/Media";
import Trigger, { ITrigger } from "../models/Trigger";
import mongoose from "mongoose";
import { parseExpressionDetailed } from "./parserService";
import Host from "../models/Host";
import Event from "../models/Event";
import Data from "../models/Data";

interface TriggerResult {
  triggered: boolean;
  highestSeverity:
    | "Note classified"
    | "Information"
    | "Warning"
    | "Average"
    | "High"
    | "Disaster"
    | null;
  triggeredIds: mongoose.Types.ObjectId[];
}

export async function hasTrigger(
  host_id: mongoose.Types.ObjectId,
  item_id: mongoose.Types.ObjectId,
  item_name: string,
  value: number
): Promise<ITrigger[] | null> {
  try {
    const triggers = await Trigger.find({
      host_id,
      items: { $elemMatch: { $eq: [item_name, item_id] } },
      enabled: true,
    });

    if (!triggers || triggers.length === 0) {
      return null;
    }

    triggers.forEach(async (trigger) => {
      const parsedExpression = parseExpressionDetailed(trigger.expression);

      // Find the position of item_name in the parsed expression
      const itemPosition = parsedExpression.findIndex((group) =>
        group[0].includes(item_name)
      );

      const oldLogicExpression = trigger.logicExpression[itemPosition];
      const oldIsExpressionValid = trigger.isExpressionValid;

      if (itemPosition !== -1) {
        const isTriggered = await evaluateLogic(
          parsedExpression,
          itemPosition,
          item_id,
          host_id
        );

        trigger.logicExpression[itemPosition] = isTriggered ? "true" : "false";
      }

      const newLogicExpression = trigger.logicExpression[itemPosition];

      const isTriggered = await calculateLogic(trigger.logicExpression);
      trigger.isExpressionValid = isTriggered;
      const newIsExpressionValid = isTriggered;

      if (trigger.ok_event_generation === "recovery expression") {
        const parsedRecoveryExpression = parseExpressionDetailed(
          trigger.recovery_expression
        );

        const itemPosition = parsedRecoveryExpression.findIndex(
          (group) => group[0] === item_name
        );

        const oldLogicRecoveryExpression =
          trigger.logicRecoveryExpression[itemPosition];
        const oldIsRecoveryExpressionValid = trigger.isRecoveryExpressionValid;

        if (itemPosition !== -1) {
          const isTriggered = await evaluateLogic(
            parsedRecoveryExpression,
            itemPosition,
            item_id,
            host_id
          );

          trigger.logicRecoveryExpression[itemPosition] = isTriggered
            ? "true"
            : "false";
        }
        const newLogicRecoveryExpression =
          trigger.logicRecoveryExpression[itemPosition];

        const isRecoveryTriggered = await calculateLogic(
          trigger.logicRecoveryExpression
        );
        trigger.isRecoveryExpressionValid = isRecoveryTriggered;
        const newIsRecoveryExpressionValid = isRecoveryTriggered;

        if (oldLogicRecoveryExpression !== newLogicRecoveryExpression) {
          await Trigger.updateOne(
            { _id: trigger._id },
            {
              $set: {
                [`logicRecoveryExpression.${itemPosition}`]:
                  trigger.logicRecoveryExpression[itemPosition],
              },
            }
          );
        }

        if (oldIsRecoveryExpressionValid !== newIsRecoveryExpressionValid) {
          await Trigger.updateOne(
            { _id: trigger._id },
            {
              $set: {
                isRecoveryExpressionValid: trigger.isRecoveryExpressionValid,
              },
            }
          );
        }
      }

      if (oldLogicExpression !== newLogicExpression) {
        await Trigger.updateOne(
          { _id: trigger._id },
          {
            $set: {
              [`logicExpression.${itemPosition}`]:
                trigger.logicExpression[itemPosition],
            },
          }
        );
      }

      if (oldIsExpressionValid !== newIsExpressionValid) {
        await Trigger.updateOne(
          { _id: trigger._id },
          {
            $set: {
              isExpressionValid: trigger.isExpressionValid,
            },
          }
        );
        if (isTriggered) {
          await handleHasTrigger(trigger);
        }
      }

      if (!isTriggered) {
        await handleNotHasTrigger(trigger);
      }
    });

    return triggers;
  } catch (error) {
    return null;
  }
}

export async function evaluateLogic(
  parsedExpression: (string | string[])[],
  itemPosition: number,
  item_id: mongoose.Types.ObjectId,
  host_id: mongoose.Types.ObjectId
): Promise<boolean> {
  const group = parsedExpression[itemPosition];
  if (group.length !== 3) {
    return false; // Invalid expression format
  }

  const [rawItem, operator, threshold] = group;
  const numericThreshold = parseFloat(threshold);

  // Parse the item name to extract function, name_item, and duration
  const itemMatch = rawItem.match(
    /(avg|min|max|last)\((.*?)(?:,\s*(\d+[mhd]))?\)/
  );
  if (!itemMatch) {
    return false; // Invalid item format
  }

  const [, func, name_item, duration = "15m"] = itemMatch;

  let value: number = 0;

  let range = 15 * 60 * 1000; // Default to 15 minutes in milliseconds
  if (duration.endsWith("m")) {
    range = parseInt(duration) * 60 * 1000;
  } else if (duration.endsWith("h")) {
    range = parseInt(duration) * 60 * 60 * 1000;
  } else if (duration.endsWith("d")) {
    range = parseInt(duration) * 24 * 60 * 60 * 1000;
  }

  const endTime = new Date();
  const startTime = new Date(endTime.getTime() - range);

  if (func === "last") {
    const datas = await Data.findOne(
      { metadata: { host_id: host_id, item_id: item_id } },
      {},
      { sort: { timestamp: -1 } }
    );
    if (datas) {
      value = datas.Change_per_second;
    }
  } else if (func === "avg") {
    const data = await Data.aggregate([
      {
        $match: {
          "metadata.host_id": host_id,
          "metadata.item_id": item_id,
          timestamp: { $gte: startTime, $lte: endTime },
        },
      },
      {
        $group: {
          _id: {
            host_id: "$metadata.host_id",
            item_id: "$metadata.item_id",
          },
          averageValue: { $avg: "$Change_per_second" },
        },
      },
    ]);

    if (data.length > 0) {
      value = data[0].averageValue;
    } else {
      console.log(
        "No data found for the given host_id, item_id, and time range"
      );
      return false;
    }
  } else if (func === "min") {
    const data = await Data.aggregate([
      {
        $match: {
          "metadata.host_id": host_id,
          "metadata.item_id": item_id,
          timestamp: { $gte: startTime, $lte: endTime },
        },
      },
      {
        $group: {
          _id: {
            host_id: "$metadata.host_id",
            item_id: "$metadata.item_id",
          },
          minValue: { $min: "$Change_per_second" },
        },
      },
    ]);

    if (data.length > 0) {
      value = data[0].minValue;
    } else {
      console.log(
        "No data found for the given host_id, item_id, and time range"
      );
      return false;
    }
  } else if (func === "max") {
    const data = await Data.aggregate([
      {
        $match: {
          "metadata.host_id": host_id,
          "metadata.item_id": item_id,
          timestamp: { $gte: startTime, $lte: endTime },
        },
      },
      {
        $group: {
          _id: {
            host_id: "$metadata.host_id",
            item_id: "$metadata.item_id",
          },
          maxValue: { $max: "$Change_per_second" },
        },
      },
    ]);

    if (data.length > 0) {
      value = data[0].maxValue;
    } else {
      console.log(
        "No data found for the given host_id, item_id, and time range"
      );
      return false;
    }
  } else {
    console.log("Invalid function name");
  }

  switch (operator) {
    case ">":
      return value > numericThreshold;
    case ">=":
      return value >= numericThreshold;
    case "<":
      return value < numericThreshold;
    case "<=":
      return value <= numericThreshold;
    case "=":
    case "==":
      return value === numericThreshold;
    case "!=":
      return value !== numericThreshold;
    default:
      return false; // Unknown operator
  }
}

async function calculateLogic(input: string[]): Promise<boolean> {
  if (input.length === 0) {
    return false;
  }

  let result = input[0].toLowerCase() === "true";
  let i = 1;

  while (i < input.length) {
    const operator = input[i].toLowerCase();
    const nextValue = input[i + 1].toLowerCase() === "true";

    switch (operator) {
      case "and":
        result = result && nextValue;
        break;
      case "or":
        result = result || nextValue;
        break;
      default:
        throw new Error(`Invalid operator: ${operator}`);
    }

    i += 2;
  }

  return result;
}

async function handleHasTrigger(trigger: ITrigger) {
  const host = await Host.findOne({ _id: trigger.host_id });
  const hostname = host?.hostname ?? "Unknown Host"; // Provide a default value if host is null or undefined
  await Event.findOneAndUpdate(
    { trigger_id: trigger._id, status: "PROBLEM" }, // Find existing
    {
      trigger_id: trigger._id,
      hostname,
      status: "PROBLEM",
      message: trigger.expression,
    }, // Insert if not found
    { upsert: true, new: true } // Upsert creates a new one if not found
  );
}
async function handleNotHasTrigger(trigger: ITrigger) {
  if (
    trigger.ok_event_generation === "recovery expression" &&
    trigger.isRecoveryExpressionValid
  ) {
    await Event.findOneAndUpdate(
      { trigger_id: trigger._id, status: "PROBLEM" }, // Find existing
      {
        status: "RESOLVED",
      }
    );
  } else if (trigger.ok_event_generation === "expression") {
    await Event.findOneAndUpdate(
      { trigger_id: trigger._id, status: "PROBLEM" }, // Find existing
      {
        status: "RESOLVED",
      }
    );
  }
}

export async function sendNotification(
  media: IMedia,
  messageTemplate: string,
  message: string
) {
  const combinedMessage = messageTemplate.replace("{}", message);

  if (media.type === "email") {
    // await sendEmail(media.details[0].email, "Alert", combinedMessage);
  } else if (media.type === "line") {
    // await sendLine(media.details[0].user_id, combinedMessage);
  }
}
