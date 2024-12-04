// src/services/schedulerService.ts
import Item from "../models/Item";
import { fetchAndStoreSnmpDataForItem } from "./snmpService";

const schedules: { [key: string]: NodeJS.Timeout } = {};

export async function setupSchedules() {
  const items = await Item.find();

  for (const item of items) {
    scheduleItem(item);
  }
}

export function scheduleItem(item: any) {
  if (schedules[item._id]) {
    clearInterval(schedules[item._id]);
  }

  schedules[item._id] = setInterval(async () => {
    try {
      // console.log(`Fetching data for item ${item._id}...`);
      await fetchAndStoreSnmpDataForItem(item);
    } catch (error) {
      console.error(`Error fetching data for item ${item._id}:`, error);
    }
  }, item.interval * 1000);
}

export function clearSchedule(itemId: string) {
  if (schedules[itemId]) {
    clearInterval(schedules[itemId]);
    delete schedules[itemId];
  }
}
