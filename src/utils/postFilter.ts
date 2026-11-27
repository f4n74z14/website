import type { CollectionEntry } from "astro:content";
import config from "@/config";
import { toZonedDayjs } from "./date";

/**
 * Determines whether a post is eligible to be listed/rendered.
 *
 * - Excludes drafts always
 * - In production, excludes posts whose `pubDatetime` falls on a later calendar
 *   day than the build date, both read in the site (or per-post) timezone
 * - In dev, always shows non-draft posts to make authoring easier
 */
export function postFilter({ data }: CollectionEntry<"posts">) {
  if (data.draft) return false;
  if (import.meta.env.DEV) return true;

  const tz = data.timezone ?? config.site.timezone;
  const publishDay = toZonedDayjs(data.pubDatetime, tz).startOf("day");
  const buildDay = toZonedDayjs(new Date(), tz).startOf("day");

  return !publishDay.isAfter(buildDay);
}
