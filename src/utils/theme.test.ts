import test from "node:test";
import assert from "node:assert/strict";
import {
  DARK,
  LIGHT,
  getThemeOverride,
  isTheme,
  resolveTheme,
} from "./theme";

test("isTheme validates light and dark values only", () => {
  assert.equal(isTheme("light"), true);
  assert.equal(isTheme("dark"), true);
  assert.equal(isTheme("auto"), false);
  assert.equal(isTheme(null), false);
  assert.equal(isTheme(undefined), false);
});

test("resolveTheme prefers valid stored theme over system preference", () => {
  assert.equal(resolveTheme(LIGHT, true), LIGHT);
  assert.equal(resolveTheme(DARK, false), DARK);
  assert.equal(resolveTheme("invalid", true), DARK);
  assert.equal(resolveTheme(null, false), LIGHT);
});

test("getThemeOverride removes override when theme matches system preference", () => {
  assert.equal(getThemeOverride(DARK, DARK), null);
  assert.equal(getThemeOverride(LIGHT, LIGHT), null);
  assert.equal(getThemeOverride(DARK, LIGHT), DARK);
  assert.equal(getThemeOverride(LIGHT, DARK), LIGHT);
});
