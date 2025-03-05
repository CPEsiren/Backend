import { sendEmail } from "../services/mailService";
import { sendLine } from "../services/lineService";
import Media from "../models/Media";
import Trigger, { ITrigger } from "../models/Trigger";
import mongoose from "mongoose";
import {
  parseExpressionDetailed,
  parseExpressionToItems,
} from "./parserService";
import Host, { IHost } from "../models/Host";
import Event, { IEvent } from "../models/Event";
import Data from "../models/Data";
import { IItem } from "../models/Item";

export async function checkCondition(
  host_id: mongoose.Types.ObjectId,
  item: IItem,
  valuelasted: number
) {
  try {
    const triggers = await Trigger.find({
      items: { $elemMatch: { $eq: [item.item_name, item._id] } },
      host_id,
      enabled: true,
    });

    if (!triggers || triggers.length === 0) {
      return null;
    }
    triggers.forEach(async (trigger) => {
      const parsedExpression = parseExpressionDetailed(trigger.expression);

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
          trigger,
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

      if (trigger.ok_event_generation === "resolved expression") {
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
            trigger,
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
      await sumTriggers(trigger, item);
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
  trigger: ITrigger,
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

  trigger.items.findIndex(([itemName, itemId]) => {
    if (itemName === item.item_name) {
      trigger.valueItem[
        trigger.items.findIndex(([itemName, itemId]) => {
          if (itemName === item.item_name) {
            return true;
          }
        })
      ] = value;
      return true;
    }
  });

  await trigger.save();

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

async function sumTriggers(trigger: ITrigger, item: IItem) {
  try {
    const sumLogicExpr = await calculateLogic(trigger.logicExpression);
    const sumLogicRecoveryExpr = await calculateLogic(
      trigger.logicRecoveryExpression
    );

    trigger.isExpressionValid = sumLogicExpr;
    trigger.isRecoveryExpressionValid = sumLogicRecoveryExpr;

    await trigger.save();
    handleTrigger(trigger, item);
  } catch (error) {
    console.log(`[${new Date().toLocaleString()}] sumTriggers : ${error}`);
  }
}

const schedulesWaitAlert: { [key: string]: NodeJS.Timeout } = {};
const schedulesWaitRecovery: { [key: string]: NodeJS.Timeout } = {};

async function handleTrigger(trigger: ITrigger, item: IItem) {
  try {
    const host = await Host.findById(trigger.host_id);

    const sumLogicExpr = trigger.isExpressionValid;
    const sumLogicRecoveryExpr = trigger.isRecoveryExpressionValid;

    if (trigger.ok_event_generation === "resolved expression") {
      if (sumLogicExpr && sumLogicRecoveryExpr) {
        await recoverOrDownSeverity(trigger);
        if (schedulesWaitAlert[trigger._id as string]) {
          clearInterval(schedulesWaitAlert[trigger._id as string]);
          delete schedulesWaitAlert[trigger._id as string];
        }
      } else if (sumLogicExpr && !sumLogicRecoveryExpr) {
        if (trigger.thresholdDuration === 0) {
          await problemOrUpSeverity(trigger, host);
        } else {
          if (!schedulesWaitAlert[trigger._id as string]) {
            schedulesWaitAlert[trigger._id as string] = setInterval(
              async () => {
                await problemOrUpSeverity(trigger, host);
              },
              trigger.thresholdDuration
            );
          }
        }
      } else if (!sumLogicExpr && sumLogicRecoveryExpr) {
        await recoverOrDownSeverity(trigger);
        if (schedulesWaitAlert[trigger._id as string]) {
          clearInterval(schedulesWaitAlert[trigger._id as string]);
          delete schedulesWaitAlert[trigger._id as string];
        }
      } else if (!sumLogicExpr && !sumLogicRecoveryExpr) {
        await recoverOrDownSeverity(trigger);
        if (schedulesWaitAlert[trigger._id as string]) {
          clearInterval(schedulesWaitAlert[trigger._id as string]);
          delete schedulesWaitAlert[trigger._id as string];
        }
      }
    } else if (trigger.ok_event_generation === "expression") {
      if (sumLogicExpr) {
        if (schedulesWaitRecovery[trigger._id as string]) {
          clearInterval(schedulesWaitRecovery[trigger._id as string]);
          delete schedulesWaitRecovery[trigger._id as string];
        }
        if (trigger.thresholdDuration === 0) {
          await problemOrUpSeverity(trigger, host);
        } else {
          if (!schedulesWaitAlert[trigger._id as string]) {
            schedulesWaitAlert[trigger._id as string] = setInterval(
              async () => {
                await problemOrUpSeverity(trigger, host);
              },
              trigger.thresholdDuration
            );
          }
        }
      } else {
        if (!schedulesWaitRecovery[trigger._id as string]) {
          schedulesWaitRecovery[trigger._id as string] = setInterval(
            async () => {
              await recoverOrDownSeverity(trigger);
              if (schedulesWaitAlert[trigger._id as string]) {
                clearInterval(schedulesWaitAlert[trigger._id as string]);
                delete schedulesWaitAlert[trigger._id as string];
              }
              clearInterval(schedulesWaitRecovery[trigger._id as string]);
              delete schedulesWaitRecovery[trigger._id as string];
            },
            item.interval * 1000 * 3
          );
        }
      }
    }
  } catch (error) {
    console.log(`[${new Date().toLocaleString()}] handleTrigger : ${error}`);
  }
}

export async function sendNotificationDevice(title: string, message: string) {
  try {
    const medias = await Media.find({ enabled: true });

    if (!medias) {
      console.log(
        `[${new Date().toLocaleString()}] No medias found or disabled`
      );
      return;
    }

    medias.forEach(async (media) => {
      if (media.type === "email") {
        console.log(
          `[${new Date().toLocaleString()}] Sending email by [${
            media.recipient.name
          }]`
        );
        await sendEmail(media.recipient.send_to, title, message);
      } else if (media.type === "line") {
        console.log(
          `[${new Date().toLocaleString()}] Sending line by [${
            media.recipient.name
          }]`
        );
        await sendLine(media.recipient.send_to, title, message);
      }
    });
  } catch (error) {
    console.log(
      `[${new Date().toLocaleString()}] sendNotificationDevice : ${error}`
    );
  }
}

export async function sendNotificationItem(event: IEvent, trigger: ITrigger) {
  try {
    const host = await Host.findOne({ _id: trigger.host_id });
    const medias = await Media.find({ enabled: true });

    if (!medias) {
      console.log(
        `[${new Date().toLocaleString()}] No medias found or disabled`
      );
      return;
    }

    const allItemandValue = trigger.items.map((item, index) => {
      return `${item[index]} : ${trigger.valueItem[index]}`;
    });

    const replacement: Record<string, string> = {
      //Trigger
      "{TRIGGER.NAME}": trigger.trigger_name,
      "{TRIGGER.EXPRESSION}": trigger.expression,
      "{TRIGGER.RESOLVED.EXPRESSION}":
        trigger.recovery_expression === ""
          ? "None"
          : trigger.recovery_expression,
      "{TRIGGER.SEVERITY}": trigger.severity,
      "{TRIGGER.ALL.ITEM&VALUE}": allItemandValue.join("\n"),
      //Host
      "{HOST.NAME}": host?.hostname ?? event.hostname,
      "{HOST.IP}": host?.ip_address ?? "Unknown IP",
      //Event
      "{EVENT.STATUS}": event.status,
      "{EVENT.PROBLEM.TIMESTAMP}": event.createdAt.toLocaleString("th-TH", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
      "{EVENT.RESOLVED.TIMESTAMP}": event.resolvedAt
        ? event.resolvedAt.toLocaleString("th-TH", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })
        : "",
    };

    medias.forEach(async (media) => {
      let title = "";
      let body = "";
      if (event.status === "RESOLVED") {
        title = replaceAll(media.recovery_title, replacement);
        body = replaceAll(media.recovery_body, replacement);
      } else {
        title = replaceAll(media.problem_title, replacement);
        body = replaceAll(media.problem_body, replacement);
      }
      if (media.type === "email") {
        console.log(
          `[${new Date().toLocaleString()}] ${trigger.trigger_name} ${
            trigger.severity
          } Sending email by [${media.recipient.name}]`
        );
        await sendEmail(media.recipient.send_to, title, body);
      } else if (media.type === "line") {
        console.log(
          `[${new Date().toLocaleString()}] Sending line by [${
            media.recipient.name
          }]`
        );
        await sendLine(media.recipient.send_to, title, body);
      }
    });
  } catch (error) {
    console.log(`[${new Date().toLocaleString()}] sendNotification : ${error}`);
  }
}

async function problemOrUpSeverity(t: ITrigger, host: IHost | null) {
  try {
    const trigger = await Trigger.findById(t._id);

    if (trigger) {
      const eventold = await Event.findOne({
        trigger_id: trigger._id,
        severity: trigger.severity,
        status: "PROBLEM",
      });

      const dependentTriggersHigher = await findDependentTriggerHigher(trigger);
      const dependentTriggersLower = await findDependentTriggerLower(trigger);

      if (
        dependentTriggersHigher.length === 0 &&
        dependentTriggersLower.length === 0
      ) {
        const eventActive = await Event.find({
          trigger_id: { $ne: trigger._id },
          status: "PROBLEM",
        });

        if (eventActive.length !== 0) {
          eventActive.filter(async (e) => {
            const trig = await Trigger.findById(e.trigger_id).select(
              "expression"
            );
            if (trig) {
              return compareNonNumeric(
                extractNonNumeric(parseExpressionDetailed(trig.expression)),
                extractNonNumeric(parseExpressionDetailed(trigger.expression))
              );
            }
          });
        }

        if (eventActive.length === 0) {
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
          if (!eventold) {
            console.log("h0_1 l0_1");
            await sendNotificationItem(event, trigger);
          }
        } else {
          const event = await Event.findOneAndUpdate(
            {
              _id: eventActive[0]._id,
            },
            {
              trigger_id: trigger._id,
              severity: trigger.severity,
              message: trigger.expression,
              createdAt: new Date(),
            }
          );
          if (event) {
            console.log("h0_2 l0_2");
            await sendNotificationItem(event, trigger);
          }
        }
      } else if (
        dependentTriggersHigher.length > 0 &&
        dependentTriggersLower.length === 0
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
          console.log("h1 l0");
          await sendNotificationItem(event, dependentTriggersHigher[0]);
        }
      } else if (
        dependentTriggersHigher.length === 0 &&
        dependentTriggersLower.length > 0
      ) {
        const eventActive = await Event.find({
          status: "PROBLEM",
        });

        if (eventActive.length !== 0) {
          eventActive.filter(async (e) => {
            const trig = await Trigger.findById(e.trigger_id).select(
              "expression"
            );
            if (trig) {
              return compareNonNumeric(
                extractNonNumeric(parseExpressionDetailed(trig.expression)),
                extractNonNumeric(parseExpressionDetailed(trigger.expression))
              );
            }
          });
        }

        if (eventActive.length === 0) {
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
          if (!eventold) {
            console.log("h0_1 l1_1");

            await sendNotificationItem(event, trigger);
          }
        } else if (
          compareSeverityHigher(eventActive[0].severity, trigger.severity)
        ) {
          const event = await Event.findOneAndUpdate(
            {
              _id: eventActive[0]._id,
            },
            {
              trigger_id: trigger._id,
              severity: trigger.severity,
              message: trigger.expression,
              createdAt: new Date(),
            }
          );
          if (!eventold && event) {
            console.log("h0_2 l1_2");
            await sendNotificationItem(event, trigger);
          }
        }
      } else if (
        dependentTriggersHigher.length > 0 &&
        dependentTriggersLower.length > 0
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
          console.log("h1 l0");
          await sendNotificationItem(event, dependentTriggersHigher[0]);
        }
      }
    }
  } catch (error) {
    console.log(
      `[${new Date().toLocaleString()}] problemOrUpSeverity : ${error}`
    );
  }
}

async function recoverOrDownSeverity(trigger: ITrigger) {
  try {
    const t = await Trigger.findById(trigger._id);
    const dependentTriggersHigher = await findDependentTriggerHigher(trigger);
    const dependentTriggersLower = await findDependentTriggerLower(trigger);
    if (
      dependentTriggersHigher.length === 0 &&
      dependentTriggersLower.length === 0
    ) {
      const event = await Event.findOneAndUpdate(
        {
          trigger_id: trigger._id,
          severity: trigger.severity,
          status: "PROBLEM",
        },
        {
          status: "RESOLVED",
          resolvedAt: new Date(),
        }
      );
      if (event) {
        const eventResolved = await Event.findOne({
          _id: event._id,
        });
        await sendNotificationItem(
          eventResolved ? eventResolved : event,
          t ? t : trigger
        );
      }
    }
  } catch (error) {
    console.log(
      `[${new Date().toLocaleString()}] recoverOrDownSeverity : ${error}`
    );
  }
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
  try {
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

      if (trig.ok_event_generation === "expression") {
        if (
          compareNonNumeric(exprNonNum, trigNonNum) &&
          trig.isExpressionValid &&
          compareSeverityHigher(trig.severity, trigger.severity)
        ) {
          dependentTriggers.push(trig);
        }
      } else {
        if (
          compareNonNumeric(exprNonNum, trigNonNum) &&
          compareSeverityHigher(trig.severity, trigger.severity)
        ) {
          if (trig.isExpressionValid && !trig.isRecoveryExpressionValid) {
            dependentTriggers.push(trig);
          }
        }
      }
    });

    dependentTriggers.sort((a, b) => {
      const severityOrder = { disaster: 3, critical: 2, warning: 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });

    return dependentTriggers;
  } catch (error) {
    console.log(
      `[${new Date().toLocaleString()}] findDependentTriggerHigher : ${error}`
    );
    return [];
  }
}

async function findDependentTriggerLower(
  trigger: ITrigger
): Promise<ITrigger[]> {
  try {
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

      if (trig.ok_event_generation === "expression") {
        if (
          compareNonNumeric(exprNonNum, trigNonNum) &&
          trig.isExpressionValid &&
          compareSeverityLower(trig.severity, trigger.severity)
        ) {
          dependentTriggers.push(trig);
        }
      } else {
        if (
          compareNonNumeric(exprNonNum, trigNonNum) &&
          compareSeverityLower(trig.severity, trigger.severity)
        ) {
          if (trig.isExpressionValid && !trig.isRecoveryExpressionValid) {
            dependentTriggers.push(trig);
          }
        }
      }
    });

    dependentTriggers.sort((a, b) => {
      const severityOrder = { disaster: 3, critical: 2, warning: 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });

    return dependentTriggers;
  } catch (error) {
    console.log(
      `[${new Date().toLocaleString()}] findDependentTriggerLower : ${error}`
    );
    return [];
  }
}

function compareSeverityHigher(
  a: ITrigger["severity"],
  b: ITrigger["severity"]
): boolean {
  try {
    const severityOrder: { [key in ITrigger["severity"]]: number } = {
      disaster: 3,
      critical: 2,
      warning: 1,
    };
    return severityOrder[a] > severityOrder[b];
  } catch (error) {
    console.log(
      `[${new Date().toLocaleString()}] compareSeverityHigher : ${error}`
    );
    return false;
  }
}

function compareSeverityLower(
  a: ITrigger["severity"],
  b: ITrigger["severity"]
): boolean {
  try {
    const severityOrder: { [key in ITrigger["severity"]]: number } = {
      disaster: 3,
      critical: 2,
      warning: 1,
    };
    return severityOrder[a] < severityOrder[b];
  } catch (error) {
    console.log(
      `[${new Date().toLocaleString()}] compareSeverityLower : ${error}`
    );
    return false;
  }
}

const replaceAll = (
  str: string,
  replacements: Record<string, string>
): string => {
  return Object.keys(replacements).reduce((acc, key) => {
    return acc.replace(new RegExp(key, "g"), replacements[key]);
  }, str);
};
