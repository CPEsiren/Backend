import mongoose from "mongoose";
import Trigger from "../models/Trigger";
import { IMedia } from "../models/Media";
import { sendLine } from "../services/lineService";
import { sendEmail } from "../services/mailService";

interface TriggerResult {
  triggered: boolean;
  highestSeverity: "critical" | "warning" | null;
  triggeredIds: mongoose.Types.ObjectId[];
}

export async function hasTrigger(
  value: number,
  host_id: mongoose.Types.ObjectId,
  item_id: mongoose.Types.ObjectId
): Promise<TriggerResult> {
  const triggers = await Trigger.find({
    host_id,
    item_id,
    severity: { $in: ["critical", "warning"] },
  }).sort({ severity: -1 });

  if (!triggers || triggers.length === 0) {
    return {
      triggered: false,
      highestSeverity: null,
      triggeredIds: [],
    };
  }

  const severityOrder: ("critical" | "warning")[] = ["critical", "warning"];
  let highestSeverity: "critical" | "warning" | null = null;
  const triggeredIds: mongoose.Types.ObjectId[] = [];
  let anyTriggerActivated = false;

  for (const severity of severityOrder) {
    const severityTriggers = triggers.filter((t) => t.severity === severity);

    for (const trigger of severityTriggers) {
      const { ComparisonOperator, valuetrigger, _id } = trigger;
      let isTriggered = false;

      switch (ComparisonOperator) {
        case "<":
          isTriggered = value < valuetrigger;
          break;
        case "<=":
          isTriggered = value <= valuetrigger;
          break;
        case "=":
          isTriggered = value === valuetrigger;
          break;
        case ">=":
          isTriggered = value >= valuetrigger;
          break;
        case ">":
          isTriggered = value > valuetrigger;
          break;
        case "!=":
          isTriggered = value !== valuetrigger;
          break;
        default:
          console.warn(`Unknown comparison operator: ${ComparisonOperator}`);
          continue;
      }

      if (isTriggered) {
        anyTriggerActivated = true;
        if (!highestSeverity) {
          highestSeverity = severity;
        }
        triggeredIds.push(_id as mongoose.Types.ObjectId);
      }
    }

    if (highestSeverity === "critical") {
      break; // Stop checking warning triggers if a critical trigger is activated
    }
  }

  if (anyTriggerActivated) {
    return {
      triggered: true,
      highestSeverity,
      triggeredIds,
    };
  } else {
    return {
      triggered: false,
      highestSeverity: null,
      triggeredIds: triggers.map((t) => t._id as mongoose.Types.ObjectId),
    };
  }
}

export async function sendNotification(
  media: IMedia,
  messageTemplate: string,
  message: string
) {
  const combinedMessage = messageTemplate.replace("{}", message);

  if (media.type === "email") {
    // sendEmail(media.details[0].email, "Alert", combinedMessage);
    console.log(
      `Sending email to ${media.details.email} with message: ${message}`
    );
  } else if (media.type === "line") {
    // sendLine(media.details[0].user_id, combinedMessage);
    console.log(
      `Sending LINE message to ${media.details.userId} with message: ${message}`
    );
  }
}
