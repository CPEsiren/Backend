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
import Item, { IItem } from "../models/Item";

export async function checkCondition(
  host_id: mongoose.Types.ObjectId,
  item: IItem
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
        if (schedulesWaitAlert[trigger._id as string]) {
          clearInterval(schedulesWaitAlert[trigger._id as string]);
          delete schedulesWaitAlert[trigger._id as string];
        }

        if (!schedulesWaitRecovery[trigger._id as string]) {
          schedulesWaitRecovery[trigger._id as string] = setInterval(
            async () => {
              await recoverOrDownSeverity(trigger);
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

export async function sendNotificationDevice(
  title: string,
  message: string,
  datachenge: string
) {
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

        let colorTitle = "#007bff";
        let colorBGbody = "#f4f4f4";

        const htmlBody = `
    <!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {
            font-family: Arial, sans-serif;
            background-color: #f4f4f4;
            margin: 0;
            padding: 20px;
        }
        h1 {
          text-align: center;
        }
        .email-container {
            max-width: 600px;
            background-color: #ffffff;
            margin: 0 auto;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            box-shadow: 0px 2px 5px rgba(0, 0, 0, 0.1);
        }
        .alert-box {
            background-color: ${colorTitle};
            color: white;
            padding: 15px;
            font-size: 20px;
            font-weight: bold;
            border-radius: 5px;
        }
        .content {
            text-align: left;
            margin: 20px 0;
            background-color: ${colorBGbody};
            border-left: 7px solid ${colorTitle};
            padding: 10px;
            margin-bottom: 10px;
            padding-left: 25px;
        }
        .button {
            display: inline-block;
            background-color: #007bff;
            color: white;
            padding: 12px 20px;
            text-decoration: none;
            font-size: 16px;
            font-weight: bold;
            border-radius: 5px;
            margin-top: 10px;
        }
        .footer {
            font-size: 12px;
            color: #888;
            margin-top: 20px;
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="alert-box">
        ${title}
        </div>
        <div class="content">
            <p>${message.replace(/\n/g, "<br>")}</p>
            <h1>${datachenge}</h1>
        </div>
        <div class="footer">
            <p>Powered by CPE Siren</p>
        </div>
    </div>
</body>
</html>
  `;
        await sendEmail(media.recipient.send_to, title, htmlBody);
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

    const allItemandValue = await Promise.all(
      trigger.items.map(async (item, index) => {
        const thisitem = await Item.findById(item[1]);
        const unit =
          thisitem?.type === "counter"
            ? `${thisitem.unit}/s`
            : `${thisitem?.unit}`;
        return `${trigger.expressionPart[index].functionofItem} ${thisitem?.item_name} in ${trigger.expressionPart[index].duration} : ${trigger.valueItem[index]} ${unit}`;
      })
    );

    const replacement: Record<string, string> = {
      //Trigger
      "{TRIGGER.NAME}": trigger.trigger_name,
      "{TRIGGER.EXPRESSION}": trigger.expression.replace(
        /(\d+(\.\d+)?)$/,
        (match) => formatNumberWithSuffix(match)
      ),
      "{TRIGGER.RESOLVED.EXPRESSION}":
        trigger.recovery_expression === "" ||
        trigger.recovery_expression === "(,)"
          ? "None"
          : trigger.recovery_expression.replace(/(\d+(\.\d+)?)$/, (match) =>
              formatNumberWithSuffix(match)
            ),
      "{TRIGGER.SEVERITY}": trigger.severity,
      "{TRIGGER.ALL.ITEM&VALUE}": allItemandValue
        .map((item) => {
          const [description, value] = item.split(" : ");
          return `${description} : ${formatNumberWithSuffix(value)}`;
        })
        .join("\n"),
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

    let colorTitle = "#007bff";
    let colorBGbody = "#f4f4f4";

    medias.forEach(async (media) => {
      let title = "";
      let body = "";
      if (event.status === "RESOLVED") {
        title = replaceAll(media.recovery_title, replacement);
        body = replaceAll(media.recovery_body, replacement);
        colorTitle = "#28a745";
        colorBGbody = "#e8f5e9";
      } else {
        title = replaceAll(media.problem_title, replacement);
        body = replaceAll(media.problem_body, replacement);
        colorTitle = "#d32f2f";
        colorBGbody = "#fff5f8";
      }

      const htmlBody = `
    <!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {
            font-family: Arial, sans-serif;
            background-color: #f4f4f4;
            margin: 0;
            padding: 20px;
        }
        .email-container {
            max-width: 600px;
            background-color: #ffffff;
            margin: 0 auto;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            box-shadow: 0px 2px 5px rgba(0, 0, 0, 0.1);
        }
        .alert-box {
            background-color: ${colorTitle};
            color: white;
            padding: 15px;
            font-size: 20px;
            font-weight: bold;
            border-radius: 5px;
        }
        .content {
            text-align: left;
            margin: 20px 0;
            background-color: ${colorBGbody};
            border-left: 7px solid ${colorTitle};
            padding: 10px;
            margin-bottom: 10px;
            padding-left: 25px;
        }
        .button {
            display: inline-block;
            background-color: #007bff;
            color: white;
            padding: 12px 20px;
            text-decoration: none;
            font-size: 16px;
            font-weight: bold;
            border-radius: 5px;
            margin-top: 10px;
        }
        .footer {
            font-size: 12px;
            color: #888;
            margin-top: 20px;
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="alert-box">
        ${title}
        </div>
        <div class="content">
            <p>${body.replace(/\n/g, "<br>")}</p>
        </div>
        <div class="footer">
            <p>Powered by CPE Siren</p>
        </div>
    </div>
</body>
</html>
  `;

      if (media.type === "email") {
        console.log(
          `[${new Date().toLocaleString()}] ${trigger.trigger_name} ${
            trigger.severity
          } Sending email by [${media.recipient.name}]`
        );
        await sendEmail(media.recipient.send_to, title, htmlBody);
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
              message: trigger.expression.replace(/(\d+(\.\d+)?)$/, (match) =>
                formatNumberWithSuffix(match)
              ),
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
              message: trigger.expression.replace(/(\d+(\.\d+)?)$/, (match) =>
                formatNumberWithSuffix(match)
              ),
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
            message: dependentTriggersHigher[0].expression.replace(
              /(\d+(\.\d+)?)$/,
              (match) => formatNumberWithSuffix(match)
            ),
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
              message: trigger.expression.replace(/(\d+(\.\d+)?)$/, (match) =>
                formatNumberWithSuffix(match)
              ),
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
              message: trigger.expression.replace(/(\d+(\.\d+)?)$/, (match) =>
                formatNumberWithSuffix(match)
              ),
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
            message: dependentTriggersHigher[0].expression.replace(
              /(\d+(\.\d+)?)$/,
              (match) => formatNumberWithSuffix(match)
            ),
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

const formatNumberWithSuffix = (value: string) => {
  const number = parseFloat(value);
  const suffixes = ["", "K", "M", "B", "T"];
  const suffixNum = Math.floor(Math.log10(Math.abs(number)) / 3);
  const shortValue = (number / Math.pow(1000, suffixNum)).toFixed(1);

  return parseFloat(shortValue) + " " + suffixes[suffixNum];
};
