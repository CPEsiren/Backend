import { fetchAndStoreSnmpDataForItem } from "./snmpService";
import { addLog } from "../middleware/log";
import Item from "../models/Item";
import Data from "../models/Data";
import Trend from "../models/Trend";

const schedules: { [key: string]: NodeJS.Timeout } = {};

export async function setupSchedules() {
  const items = await Item.find();

  for (const item of items) {
    scheduleItem(item);
  }

  // Schedule the hourly data summarization
  scheduleHourlySummarization();
}

export function scheduleItem(item: any) {
  if (schedules[item._id]) {
    clearInterval(schedules[item._id]);
  }

  schedules[item._id] = setInterval(async () => {
    try {
      await fetchAndStoreSnmpDataForItem(item);
    } catch (error) {
      await addLog(
        "ERROR",
        `Error fetching data for item ${item._id}: ${error}`,
        true
      );
    }
  }, item.interval * 1000);
}

export function clearSchedule(itemId: string) {
  if (schedules[itemId]) {
    clearInterval(schedules[itemId]);
    delete schedules[itemId];
  }
}

export function scheduleHourlySummarization() {
  const now = new Date();
  const nextHour = new Date(now);
  nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0); // Set to the next hour

  const msUntilNextHour = nextHour.getTime() - now.getTime();

  // Schedule the first run
  setTimeout(() => {
    summarizeDataToTrend();
    // Set up recurring schedule
    setInterval(summarizeDataToTrend, 60 * 60 * 1000); // Run every hour
  }, msUntilNextHour);
}

async function summarizeDataToTrend() {
  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const now = new Date();

    const aggregationResult = await Data.aggregate([
      {
        $match: {
          timestamp: { $gte: oneHourAgo, $lt: now },
        },
      },
      {
        $group: {
          _id: {
            host_id: "$metadata.host_id",
            item_id: "$metadata.item_id",
            item_type: "$metadata.item_type",
          },
          averageValue: { $avg: "$Change_per_second" },
          minValue: { $min: "$Change_per_second" },
          maxValue: { $max: "$Change_per_second" },
        },
      },
    ]);

    for (const result of aggregationResult) {
      await Trend.create({
        metadata: {
          host_id: result._id.host_id,
          item_id: result._id.item_id,
          item_type: result._id.item_type,
        },
        timestamp: now,
        value_min: result.minValue,
        value_max: result.maxValue,
        value_avg: result.averageValue,
      });
    }

    await addLog("INFO", "Hourly data summarization completed", true);
  } catch (error) {
    await addLog("ERROR", `Error in hourly data summarization: ${error}`, true);
  }
}
