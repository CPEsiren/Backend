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

export async function checkCondition(
  host_id: mongoose.Types.ObjectId,
  item: IItem,
  valuelasted: number
) {
  try {
    const triggers = await Trigger.find({
      host_id,
      enabled: true,
    });

    triggers.map(async (trigger) => {
      trigger.items.forEach(async (i) => {
        if (i[0] === item.item_name && i[1] == item._id) {
          return trigger;
        }
      });
    });

    if (!triggers || triggers.length === 0) {
      return null;
    }

    triggers.forEach(async (trigger) => {
      const parsedExpression = parseExpressionDetailed(trigger.expression);

      trigger.items.forEach(async (i) => {
        if (i[0] === item.item_name) {
          i[2] = valuelasted;
        }
      });

      await trigger.save();

      // Find all positions of item_name in the parsed expression
      const itemPositions = parsedExpression.reduce(
        (positions, group, index) => {
          if (group[0].includes(item.item_name)) {
            positions.push(index);
          }
          return positions;
        },
        [] as number[]
      );

      const oldLogicExpressions = itemPositions.map(
        (pos) => trigger.logicExpression[pos]
      );

      for (const itemPosition of itemPositions) {
        const isTriggered = await evaluateLogic(
          parsedExpression,
          itemPosition,
          item,
          host_id
        );

        trigger.logicExpression[itemPosition] = isTriggered.result
          ? "true"
          : "false";
      }

      const newLogicExpressions = itemPositions.map(
        (pos) => trigger.logicExpression[pos]
      );

      if (trigger.ok_event_generation === "recovery expression") {
        const parsedRecoveryExpression = parseExpressionDetailed(
          trigger.recovery_expression
        );

        const recoveryItemPositions = parsedRecoveryExpression.reduce(
          (positions, group, index) => {
            if (group[0].includes(item.item_name)) {
              positions.push(index);
            }
            return positions;
          },
          [] as number[]
        );

        const oldLogicRecoveryExpressions = recoveryItemPositions.map(
          (pos) => trigger.logicRecoveryExpression[pos]
        );

        for (const itemPosition of recoveryItemPositions) {
          const isTriggered = await evaluateLogic(
            parsedRecoveryExpression,
            itemPosition,
            item,
            host_id
          );

          trigger.logicRecoveryExpression[itemPosition] = isTriggered.result
            ? "true"
            : "false";
        }

        const newLogicRecoveryExpressions = recoveryItemPositions.map(
          (pos) => trigger.logicRecoveryExpression[pos]
        );

        if (
          !arraysEqual(oldLogicRecoveryExpressions, newLogicRecoveryExpressions)
        ) {
          await Trigger.updateOne(
            { _id: trigger._id },
            {
              $set: Object.fromEntries(
                recoveryItemPositions.map((pos) => [
                  `logicRecoveryExpression.${pos}`,
                  trigger.logicRecoveryExpression[pos],
                ])
              ),
            }
          );
        }
      }

      if (!arraysEqual(oldLogicExpressions, newLogicExpressions)) {
        await Trigger.updateOne(
          { _id: trigger._id },
          {
            $set: Object.fromEntries(
              itemPositions.map((pos) => [
                `logicExpression.${pos}`,
                trigger.logicExpression[pos],
              ])
            ),
          }
        );
      }
      await sumTriggers(trigger);
    });
  } catch (error) {
    console.error(`Error hasTrigger : `, error);
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
        console.error(`Invalid operator: ${operator}`);
    }

    i += 2;
  }

  return result;
}

const schedules: { [key: string]: NodeJS.Timeout } = {};

async function sumTriggers(trigger: ITrigger) {
  try {
    const sumLogicExpr = await calculateLogic(trigger.logicExpression);
    const sumLogicRecoveryExpr = await calculateLogic(
      trigger.logicRecoveryExpression
    );

    trigger.isExpressionValid = sumLogicExpr;
    trigger.isRecoveryExpressionValid = sumLogicRecoveryExpr;

    await trigger.save();
    handleTrigger(trigger);
  } catch (error) {
    console.log(`[${new Date().toLocaleString()}] sumTriggers : ${error}`);
  }
}

async function handleTrigger(trigger: ITrigger) {
  try {
    const host = await Host.findById(trigger.host_id);
    const eventold = await Event.findOne({
      trigger_id: trigger._id,
      severity: trigger.severity,
      status: "PROBLEM",
    });

    const sumLogicExpr = trigger.isExpressionValid;
    const sumLogicRecoveryExpr = trigger.isRecoveryExpressionValid;

    if (trigger.ok_event_generation === "recovery expression") {
      if (sumLogicExpr && sumLogicRecoveryExpr) {
        const event = await Event.findOneAndUpdate(
          {
            trigger_id: trigger._id,
            severity: trigger.severity,
            status: "PROBLEM",
          },
          {
            status: "RESOLVED",
            message: trigger.recovery_expression,
          }
        );
        if (event) {
          await sendNotification(event, trigger);
        }
      } else if (sumLogicExpr && !sumLogicRecoveryExpr) {
        const event = await Event.findOneAndUpdate(
          {
            trigger_id: trigger._id,
            severity: trigger.severity,
            status: "PROBLEM",
          },
          {
            trigger_id: trigger._id,
            type: trigger.type,
            severity: trigger.severity,
            hostname: host?.hostname,
            status: "PROBLEM",
            message: trigger.expression,
          },
          {
            upsert: true,
            new: true,
          }
        );
        if (event) {
          if (eventold?.status !== event.status) {
            await sendNotification(event, trigger);
          }
        }
      } else if (!sumLogicExpr && sumLogicRecoveryExpr) {
        const event = await Event.findOneAndUpdate(
          {
            trigger_id: trigger._id,
            severity: trigger.severity,
            status: "PROBLEM",
          },
          {
            status: "RESOLVED",
            message: trigger.recovery_expression,
          }
        );
        if (event) {
          await sendNotification(event, trigger);
        }
      } else if (!sumLogicExpr && !sumLogicRecoveryExpr) {
        const event = await Event.findOneAndUpdate(
          {
            trigger_id: trigger._id,
            severity: trigger.severity,
            status: "PROBLEM",
          },
          {
            status: "RESOLVED",
            message: trigger.recovery_expression,
          }
        );
        if (event) {
          await sendNotification(event, trigger);
        }
      }
    } else if (trigger.ok_event_generation === "expression") {
      if (sumLogicExpr) {
        const dependentTriggersHigher = await findDependentTriggerHigher(
          trigger
        );

        if (dependentTriggersHigher.length === 0) {
          const expr = extractNonNumeric(
            parseExpressionDetailed(trigger.expression)
          );
          const e = await Event.find({
            trigger_id: {
              $ne: trigger._id,
            },
            status: "PROBLEM",
          });
          e.filter((e) => {
            return compareNonNumeric(parseExpressionDetailed(e.message), expr);
          });
          if (e.length === 0) {
            const event = await Event.findOneAndUpdate(
              {
                trigger_id: trigger._id,
                severity: trigger.severity,
                status: "PROBLEM",
              },
              {
                trigger_id: trigger._id,
                type: trigger.type,
                severity: trigger.severity,
                hostname: host?.hostname,
                status: "PROBLEM",
                message: trigger.expression,
              },
              {
                upsert: true,
                new: true,
              }
            );
            if (event) {
              if (eventold?.status !== event.status) {
                await sendNotification(event, trigger);
              }
            }
          }
        } else {
          if (
            compareSeverityHigher(
              dependentTriggersHigher[0].severity,
              trigger.severity
            )
          ) {
            const event = await Event.findOneAndUpdate(
              {
                trigger_id: trigger._id,
                severity: trigger.severity,
                status: "PROBLEM",
              },
              {
                trigger_id: dependentTriggersHigher[0]._id,
                severity: dependentTriggersHigher[0].severity,
                message: dependentTriggersHigher[0].expression,
                createdAt: new Date(),
              }
            );
            if (event) {
              await sendNotification(event, trigger);
            }
          }
        }
      } else {
        const dependentTriggersLower = await findDependentTriggerLower(trigger);
        if (dependentTriggersLower.length === 0) {
          const event = await Event.findOneAndUpdate(
            {
              trigger_id: trigger._id,
              severity: trigger.severity,
              status: "PROBLEM",
            },
            {
              status: "RESOLVED",
            }
          );
          if (event) {
            await sendNotification(event, trigger);
          }
        } else {
          if (
            compareSeverityLower(
              dependentTriggersLower[0].severity,
              trigger.severity
            )
          ) {
            const event = await Event.findOneAndUpdate(
              {
                trigger_id: trigger._id,
                severity: trigger.severity,
                status: "PROBLEM",
              },
              {
                trigger_id: dependentTriggersLower[0]._id,
                severity: dependentTriggersLower[0].severity,
                message: dependentTriggersLower[0].expression,
                createdAt: new Date(),
              }
            );
            if (event) {
              await sendNotification(event, trigger);
            }
          }
        }
      }
    }
  } catch (error) {
    console.log(`[${new Date().toLocaleString()}] handleTrigger : ${error}`);
  }
}

export async function handleHasTrigger(
  trigger: ITrigger,
  valueAlerted: number,
  item: IItem | null
) {
  try {
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
      await sendNotification(event, trigger);
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
      await sendNotification(event, trigger);
    }
  }
}

export async function sendNotification(event: IEvent, trigger: ITrigger) {
  const host = await Host.findOne({ _id: trigger.host_id });
  const medias = await Media.find({ enabled: true });

  if (!medias) {
    console.log(`[${new Date().toLocaleString()}] No medias found or disabled`);
    return;
  }

  const replacement = {
    //Trigger
    "{TRIGGER.NAME}": trigger.trigger_name,
    "{TRIGGER.EXPRESSION}": trigger.expression,
    "{TRIGGER.RECOVERY_EXPRESSION}": trigger.recovery_expression,
    "{TRIGGER.SEVERITY}": trigger.severity,
    //Host
    "{HOST.NAME}": host?.hostname ?? event.hostname,
    "{HOST.IP}": host?.ip_address ?? "Unknown IP",
    //Item
    // "{ITEM.NAME}": item?.item_name ?? "Unknown Item",
    // "{ITEM.VALUE}": event.value_alerted,
    //Event
    "{EVENT.STATUS}": event.status,
    "{EVENT.PROBLEM.TIMESTAMP}": event.createdAt.toLocaleString(),
    "{EVENT.RECOVERY.TIMESTAMP}": event.updatedAt.toLocaleString(),
  };

  medias.forEach(async (media) => {
    if (media.type === "email") {
      console.log(
        `[${new Date().toLocaleString()}] Sending email by [${
          media.recipient.name
        }]`
      );
      // await sendEmail(
      //   media.recipient.send_to,
      //   media.problem_title,
      //   media.problem_body
      // );
    } else if (media.type === "line") {
      console.log(
        `[${new Date().toLocaleString()}] Sending line by [${
          media.recipient.name
        }]`
      );
      // await sendLine(
      //   media.recipient.send_to,
      //   media.problem_title,
      //   media.problem_body
      // );
    }
  });
}

function extractNonNumeric(expression: any[]): any[] {
  function extract(item: any): any {
    if (Array.isArray(item)) {
      return item.map(extract).filter((el) => el !== null);
    } else if (typeof item === "string") {
      // Check if the string is not a number
      if (isNaN(Number(item))) {
        return item;
      }
    }
    return null;
  }

  return extract(expression);
}

function compareNonNumeric(expr1: any[], expr2: any[]): boolean {
  if (expr1.length !== expr2.length) return false;

  return expr1.every((item, index) => {
    if (Array.isArray(item) && Array.isArray(expr2[index])) {
      return compareNonNumeric(item, expr2[index]);
    }
    return item === expr2[index];
  });
}

// Helper function to compare arrays
function arraysEqual(a: any[], b: any[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

async function findDependentTriggerHigher(
  trigger: ITrigger
): Promise<ITrigger[]> {
  const exprNonNum = extractNonNumeric(
    parseExpressionDetailed(trigger.expression)
  );

  const Triggers = await Trigger.find({
    _id: { $ne: trigger._id },
    enabled: true,
  });

  const dependentTriggers: ITrigger[] = [];

  Triggers.forEach(async (trig) => {
    const trigNonNum = extractNonNumeric(
      parseExpressionDetailed(trigger.expression)
    );

    if (
      compareNonNumeric(exprNonNum, trigNonNum) &&
      trig.isExpressionValid &&
      compareSeverityHigher(trig.severity, trigger.severity)
    ) {
      dependentTriggers.push(trig);
    }
  });

  dependentTriggers.sort((a, b) => {
    const severityOrder = { disaster: 3, critical: 2, warning: 1 };
    return severityOrder[b.severity] - severityOrder[a.severity];
  });

  return dependentTriggers;
}

async function findDependentTriggerLower(
  trigger: ITrigger
): Promise<ITrigger[]> {
  const exprNonNum = extractNonNumeric(
    parseExpressionDetailed(trigger.expression)
  );

  const Triggers = await Trigger.find({
    _id: { $ne: trigger._id },
    enabled: true,
  });

  const dependentTriggers: ITrigger[] = [];

  Triggers.forEach(async (trig) => {
    const trigNonNum = extractNonNumeric(
      parseExpressionDetailed(trigger.expression)
    );

    if (
      compareNonNumeric(exprNonNum, trigNonNum) &&
      trig.isExpressionValid &&
      compareSeverityLower(trig.severity, trigger.severity)
    ) {
      dependentTriggers.push(trig);
    }
  });

  dependentTriggers.sort((a, b) => {
    const severityOrder = { disaster: 3, critical: 2, warning: 1 };
    return severityOrder[b.severity] - severityOrder[a.severity];
  });

  return dependentTriggers;
}

function compareSeverityHigher(
  a: ITrigger["severity"],
  b: ITrigger["severity"]
): boolean {
  const severityOrder: { [key in ITrigger["severity"]]: number } = {
    disaster: 3,
    critical: 2,
    warning: 1,
  };
  return severityOrder[a] >= severityOrder[b];
}

function compareSeverityLower(
  a: ITrigger["severity"],
  b: ITrigger["severity"]
): boolean {
  const severityOrder: { [key in ITrigger["severity"]]: number } = {
    disaster: 3,
    critical: 2,
    warning: 1,
  };
  return severityOrder[a] < severityOrder[b];
}
