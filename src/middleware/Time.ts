import { differenceInDays } from "date-fns";
export function isMoreThanSevenDays(startDate: Date, endDate: Date): boolean {
  return differenceInDays(endDate, startDate) > 2;
}
