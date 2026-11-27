import test from "node:test";
import assert from "node:assert/strict";
import { formatLocalizedDate, toZonedDayjs } from "./date";
import { resolveTimezone } from "./resolveTimezone";

test("resolveTimezone keeps valid IANA zones and falls back to UTC on invalid input", () => {
  assert.equal(resolveTimezone(undefined), "UTC");
  assert.equal(resolveTimezone("Asia/Bangkok"), "Asia/Bangkok");
  assert.equal(resolveTimezone("Invalid/Timezone_Name"), "UTC");
});

test("toZonedDayjs and formatLocalizedDate convert dates to target timezone", () => {
  const utcDate = new Date("2026-05-10T20:00:00Z");
  const bangkok = toZonedDayjs(utcDate, "Asia/Bangkok");
  assert.equal(bangkok.date(), 11);

  const formatted = formatLocalizedDate(utcDate, "en", "Asia/Bangkok");
  assert.equal(formatted.formatted, "11 May, 2026");
  assert.ok(formatted.iso.endsWith("Z"));
});
