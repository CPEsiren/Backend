import {
  checkInterfaceStatus,
  checkSnmpConnection,
  fetchAndStoreSnmpDataForItem,
  fetchAndStoreTotalTraffic,
} from "./snmpService";
import Item from "../models/Item";
import Data from "../models/Data";
import Trend from "../models/Trend";
import Host from "../models/Host";

const schedules: { [key: string]: NodeJS.Timeout } = {};

export async function setupSchedules() {
  const items = await Item.find();
  const hosts = await Host.find();

  for (const host of hosts) {
    await scheduleHost(host);
  }

  for (const item of items) {
    await scheduleItem(item);
  }

  // Schedule the hourly data summarization
  scheduleHourlySummarization();
}

export async function scheduleHost(host: any) {
  if (schedules[host._id]) {
    clearInterval(schedules[host._id]);
  }

  checkSnmpConnection(host._id);

  schedules[host._id] = setInterval(async () => {
    try {
      await checkSnmpConnection(host._id);
      if (host.status == 1) {
        await checkInterfaceStatus(host._id);
      }
    } catch (error) {
      console.error(`Error fetching data for host ${host._id}:`, error);
    }
  }, 10 * 1000);
}

export async function scheduleItem(item: any) {
  if (schedules[item._id]) {
    clearInterval(schedules[item._id]);
  }

  if (item.isOverview) {
    await fetchAndStoreTotalTraffic(item);
  } else {
    await fetchAndStoreSnmpDataForItem(item);
  }

  schedules[item._id] = setInterval(async () => {
    try {
      if (item.isOverview) {
        await fetchAndStoreTotalTraffic(item);
      } else {
        await fetchAndStoreSnmpDataForItem(item);
      }
    } catch (error) {
      console.error(`Error fetching data for item ${item._id}:`, error);
    }
  }, item.interval * 1000);
}

export function clearSchedule(Id: string) {
  if (schedules[Id]) {
    clearInterval(schedules[Id]);
    delete schedules[Id];
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
  } catch (error) {}
}
