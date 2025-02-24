import { sendEmail } from "../services/mailService";
import { sendLine } from "../services/lineService";
import Media, { IMedia } from "../models/Media";
import Trigger, { ITrigger } from "../models/Trigger";
import mongoose from "mongoose";
import {
  parseExpressionDetailed,
  parseExpressionToItems,
} from "./parserService";
import Host from "../models/Host";
import Event, { IEvent } from "../models/Event";
import Data from "../models/Data";
import Item, { IItem } from "../models/Item";
import Action, { IAction } from "../models/Action";
import { ok } from "assert";
import { stat } from "fs";

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
  item: IItem
): Promise<ITrigger[] | null> {
  try {
    const triggers = await Trigger.find({
      host_id,
      items: { $elemMatch: { $eq: [item.item_name, item._id] } },
      enabled: true,
    });

    if (!triggers || triggers.length === 0) {
      return null;
    }

    triggers.forEach(async (trigger) => {
      let valueAlerted = 0;

      const parsedExpression = parseExpressionDetailed(trigger.expression);

      // Find the position of item_name in the parsed expression
      const itemPosition = parsedExpression.findIndex((group) =>
        group[0].includes(item.item_name)
      );

      const oldLogicExpression = trigger.logicExpression[itemPosition];
      const oldIsExpressionValid = trigger.isExpressionValid;

      if (itemPosition !== -1) {
        const isTriggered = await evaluateLogic(
          parsedExpression,
          itemPosition,
          item,
          host_id
        );

        trigger.logicExpression[itemPosition] = isTriggered.result
          ? "true"
          : "false";
        valueAlerted = isTriggered.value;
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
          (group) => group[0] === item.item_name
        );

        const oldLogicRecoveryExpression =
          trigger.logicRecoveryExpression[itemPosition];
        const oldIsRecoveryExpressionValid = trigger.isRecoveryExpressionValid;

        if (itemPosition !== -1) {
          const isTriggered = await evaluateLogic(
            parsedRecoveryExpression,
            itemPosition,
            item,
            host_id
          );

          trigger.logicRecoveryExpression[itemPosition] = isTriggered.result
            ? "true"
            : "false";
          valueAlerted = isTriggered.value;
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
          await handleHasTrigger(trigger, valueAlerted, item);
        }
      }

      if (!isTriggered) {
        await handleNotHasTrigger(trigger, item);
      }
    });

    return triggers;
  } catch (error) {
    return null;
  }
}

export async function evaluateHost(
  trigger: ITrigger,
  valueAlerted: number
): Promise<{ result: boolean; value: number }> {
  const itemName = parseExpressionToItems(trigger.expression);

  const parsedExpression = parseExpressionDetailed(trigger.expression);

  // Find the position of item_name in the parsed expression
  const itemPosition = parsedExpression.findIndex((group) =>
    group[0].includes(itemName[0])
  );

  const group = parsedExpression[itemPosition];
  if (group.length !== 3) {
    return {
      result: false,
      value: valueAlerted,
    };
  }

  const [rawItem, operator, threshold] = group;
  const numericThreshold = parseFloat(threshold);

  const itemMatch = rawItem.match(
    /(avg|min|max|last)\((.*?)(?:,\s*(\d+[mhd]))?\)/
  );
  if (!itemMatch) {
    return {
      result: false,
      value: valueAlerted,
    };
  }

  switch (operator) {
    case ">":
      return { result: valueAlerted > numericThreshold, value: valueAlerted };
    case ">=":
      return { result: valueAlerted >= numericThreshold, value: valueAlerted };
    case "<":
      return { result: valueAlerted < numericThreshold, value: valueAlerted };
    case "<=":
      return { result: valueAlerted <= numericThreshold, value: valueAlerted };
    case "=":
    case "==":
      return { result: valueAlerted === numericThreshold, value: valueAlerted };
    case "!=":
      return { result: valueAlerted !== numericThreshold, value: valueAlerted };
    default:
      return {
        result: false,
        value: valueAlerted,
      };
  }
}

export async function evaluateLogic(
  parsedExpression: (string | string[])[],
  itemPosition: number,
  item: IItem,
  host_id: mongoose.Types.ObjectId
): Promise<{ result: boolean; value: number }> {
  let value: number = 0;
  const group = parsedExpression[itemPosition];
  if (group.length !== 3) {
    return {
      result: false,
      value,
    };
  }

  const [rawItem, operator, threshold] = group;
  const numericThreshold = parseFloat(threshold);

  // Parse the item name to extract function, name_item, and duration
  const itemMatch = rawItem.match(
    /(avg|min|max|last)\((.*?)(?:,\s*(\d+[mhd]))?\)/
  );
  if (!itemMatch) {
    return {
      result: false,
      value,
    };
  }

  const [, func, name_item, duration = "15m"] = itemMatch;

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
      {
        "metadata.host_id": host_id,
        "metadata.item_id": item._id,
        "metadata.isBandwidth": item.isBandwidth,
      },
      {},
      { sort: { timestamp: -1 } }
    );
    if (datas) {
      value = datas.value;
    }
  } else if (func === "avg") {
    const data = await Data.aggregate([
      {
        $match: {
          "metadata.host_id": host_id,
          "metadata.item_id": item._id,
          "metadata.isBandwidth": item.isBandwidth,
          timestamp: { $gte: startTime, $lte: endTime },
        },
      },
      {
        $group: {
          _id: {
            host_id: "$metadata.host_id",
            item_id: "$metadata.item_id",
            isBandwidth: "$metadata.isBandwidth",
          },
          averageValue: { $avg: "$value" },
        },
      },
    ]);

    if (data.length > 0) {
      value = data[0].averageValue;
    } else {
      console.log(
        `[${new Date().toLocaleString()}] No data found for the given host_id, item_id, and time range`
      );
      return {
        result: false,
        value,
      };
    }
  } else if (func === "min") {
    const data = await Data.aggregate([
      {
        $match: {
          "metadata.host_id": host_id,
          "metadata.item_id": item._id,
          "metadata.isBandwidth": item.isBandwidth,
          timestamp: { $gte: startTime, $lte: endTime },
        },
      },
      {
        $group: {
          _id: {
            host_id: "$metadata.host_id",
            item_id: "$metadata.item_id",
            isBandwidth: "$metadata.isBandwidth",
          },
          minValue: { $min: "$value" },
        },
      },
    ]);

    if (data.length > 0) {
      value = data[0].minValue;
    } else {
      console.log(
        `[${new Date().toLocaleString()}] No data found for the given host_id, item_id, and time range`
      );
      return {
        result: false,
        value,
      };
    }
  } else if (func === "max") {
    const data = await Data.aggregate([
      {
        $match: {
          "metadata.host_id": host_id,
          "metadata.item_id": item._id,
          "metadata.isBandwidth": item.isBandwidth,
          timestamp: { $gte: startTime, $lte: endTime },
        },
      },
      {
        $group: {
          _id: {
            host_id: "$metadata.host_id",
            item_id: "$metadata.item_id",
            isBandwidth: "$metadata.isBandwidth",
          },
          maxValue: { $max: "$value" },
        },
      },
    ]);

    if (data.length > 0) {
      value = data[0].maxValue;
    } else {
      console.log(
        `[${new Date().toLocaleString()}] No data found for the given host_id, item_id, and time range`
      );
      return {
        result: false,
        value,
      };
    }
  } else {
    console.log(`[${new Date().toLocaleString()}] Invalid function name`);
  }

  switch (operator) {
    case ">":
      return { result: value > numericThreshold, value };
    case ">=":
      return { result: value >= numericThreshold, value };
    case "<":
      return { result: value < numericThreshold, value };
    case "<=":
      return { result: value <= numericThreshold, value };
    case "=":
    case "==":
      return { result: value === numericThreshold, value };
    case "!=":
      return { result: value !== numericThreshold, value };
    default:
      return {
        result: false,
        value,
      };
  }
}

export async function calculateLogic(input: string[]): Promise<boolean> {
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

const schedules: { [key: string]: NodeJS.Timeout } = {};

export async function handleHasTrigger(
  trigger: ITrigger,
  valueAlerted: number,
  item: IItem | null
) {
  try {
    const host = await Host.findOne({ _id: trigger.host_id });
    const hostname = host?.hostname ?? "Unknown Host"; // Provide a default value if host is null or undefined

    const existingEvent = await Event.findOne({
      trigger_id: trigger._id,
      status: "PROBLEM",
    });

    const updatedEvent = await Event.findOneAndUpdate(
      { trigger_id: trigger._id, status: "PROBLEM" },
      {
        trigger_id: trigger._id,
        type: trigger.type,
        severity: trigger.severity,
        hostname,
        status: "PROBLEM",
        value_alerted: valueAlerted,
        message: trigger.expression,
      },
      { upsert: true, new: true }
    );

    const duration = 60 * 1000;

    // Check if a new event was created or an existing one was updated
    if (!existingEvent || !updatedEvent.equals(existingEvent)) {
      console.log(
        `[${new Date().toLocaleString()}] Event problem of trigger ${
          trigger.trigger_name
        }`
      );
      await handleAction(updatedEvent, trigger, item);
      schedules[updatedEvent._id as string] = setInterval(async () => {
        try {
          await handleAction(updatedEvent, trigger, item);
        } catch (error) {
          console.error(`Interval Action Error`, error);
        }
      }, duration);
    }
  } catch (error) {
    console.log(`[${new Date().toLocaleString()}] handleHasTrigger : ${error}`);
  }
}
export async function handleNotHasTrigger(
  trigger: ITrigger,
  item: IItem | null
) {
  if (
    trigger.ok_event_generation === "recovery expression" &&
    trigger.isRecoveryExpressionValid
  ) {
    const event = await Event.findOneAndUpdate(
      {
        trigger_id: trigger._id,
        type: "item",
        severity: trigger.severity,
        status: "PROBLEM",
      },
      {
        status: "RESOLVED",
      },
      { new: true }
    );

    clearInterval(schedules[event?._id as string]);
    if (event) {
      await handleAction(event, trigger, item);
      console.log(
        `[${new Date().toLocaleString()}] Event resolved of trigger ${
          trigger.trigger_name
        } by recovery expression`
      );
    }
  } else if (trigger.ok_event_generation === "expression") {
    const event = await Event.findOneAndUpdate(
      {
        trigger_id: trigger._id,
        severity: trigger.severity,
        status: "PROBLEM",
      },
      {
        status: "RESOLVED",
      },
      { new: true }
    );

    clearInterval(schedules[event?._id as string]);
    if (event) {
      console.log(
        `[${new Date().toLocaleString()}] Event resolved of trigger ${
          trigger.trigger_name
        } by expression`
      );
      await handleAction(event, trigger, item);
    }
  }
}

export async function handleAction(
  event: IEvent,
  trigger: ITrigger,
  item: IItem | null
) {
  const actions = await Action.find({ enabled: true });

  if (!actions) {
    console.log(
      `[${new Date().toLocaleString()}] No actions found or disabled`
    );
    return;
  }

  actions.forEach(async (action) => {
    action.media_ids.forEach(async (media_id) => {
      const media = await Media.findOne({ _id: media_id, enabled: true });
      if (media) {
        await sendNotification(media, action, event, trigger, item);
      }
    });
  });
}
export async function sendNotification(
  media: IMedia,
  action: IAction,
  event: IEvent,
  trigger: ITrigger,
  item: IItem | null
) {
  const host = await Host.findOne({ _id: trigger.host_id });
  const { type, recipient } = media;
  const { status } = event;
  let subject: string = "";
  let body: string = "";
  if (status === "RESOLVED") {
    const { subjectRecoveryTemplate, messageRecoveryTemplate } = action;
    subject = subjectRecoveryTemplate;
    body = messageRecoveryTemplate;
  } else {
    const { subjectProblemTemplate, messageProblemTemplate } = action;
    subject = subjectProblemTemplate;
    body = messageProblemTemplate;
  }

  const replacement = {
    //Trigger
    "{TRIGGER.NAME}": trigger.trigger_name,
    "{TRIGGER.EXPRESSION}": trigger.expression,
    "{TRIGGER.RECOVERY_EXPRESSION}": trigger.recovery_expression,
    "{TRIGGER.SEVERITY}": trigger.severity,
    "{TRIGGER.STATUS}": status,
    //Host
    "{HOST.NAME}": host?.hostname ?? event.hostname,
    "{HOST.IP}": host?.ip_address ?? "Unknown IP",
    //Item
    "{ITEM.NAME}": item?.item_name ?? "Unknown Item",
    "{ITEM.VALUE}": event.value_alerted,
    //Event
    "{EVENT.STATUS}": event.status,
    "{EVENT.HOSTNAME}": event.hostname,
    "{EVENT.LASTVALUE}": event.value_alerted,
    "{EVENT.TIMESTAMP}": event.createdAt.toLocaleString(),
  };

  subject = Object.entries(replacement).reduce(
    (acc, [key, value]) => acc.replace(key, value as string),
    subject
  );

  body = Object.entries(replacement).reduce(
    (acc, [key, value]) => acc.replace(key, value as string),
    body
  );

  if (type === "email") {
    console.log(
      `[${new Date().toLocaleString()}] Sending email by [${subject}]`
    );
    // sendEmail(recipient, subject, body);
  } else if (type === "line") {
  }
}
