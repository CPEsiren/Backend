import { fetchAndStoreSnmpDataForItem } from "./snmpService";
import { addLog } from "./logService";
import Item from "../models/Item";

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
