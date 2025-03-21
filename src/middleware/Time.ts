import { differenceInDays } from "date-fns";
export function isMoreThanOneDays(startDate: Date, endDate: Date): boolean {
  return differenceInDays(endDate, startDate) >= 1;
}
