import dayjs from "dayjs";
import "dayjs/locale/ru";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { resolveTimezone } from "./resolveTimezone";

dayjs.extend(utc);
dayjs.extend(timezone);

export function toZonedDayjs(
  date: string | Date,
  zone?: string,
  fallbackZone = "UTC"
) {
  return dayjs(date).tz(resolveTimezone(zone ?? fallbackZone));
}

export function formatLocalizedDate(
  date: string | Date,
  locale: string,
  zone?: string,
  fallbackZone = "UTC"
) {
  const zoned = toZonedDayjs(date, zone, fallbackZone);
  return {
    iso: zoned.toISOString(),
    formatted: zoned.locale(locale).format("D MMMM, YYYY"),
  };
}
