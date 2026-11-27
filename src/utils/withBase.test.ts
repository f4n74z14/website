import test from "node:test";
import assert from "node:assert/strict";
import { isSafeInternalPath, stripLocale, getAssetPath } from "./withBase";

test("isSafeInternalPath accepts relative root paths and rejects schemes or protocol-relative URLs", () => {
  assert.equal(isSafeInternalPath("/posts/hello"), true);
  assert.equal(isSafeInternalPath("/"), true);
  assert.equal(isSafeInternalPath("//evil.com"), false);
  assert.equal(isSafeInternalPath("https://evil.com"), false);
  assert.equal(isSafeInternalPath("javascript:alert(1)"), false);
  assert.equal(isSafeInternalPath(null), false);
});

test("stripLocale removes matching locale prefixes", () => {
  assert.equal(stripLocale("/en/posts/foo", "en"), "/posts/foo");
  assert.equal(stripLocale("/en", "en"), "/");
  assert.equal(stripLocale("/posts/foo", "en"), "/posts/foo");
});

test("getAssetPath normalizes leading slashes", () => {
  assert.equal(getAssetPath("/favicon.ico"), "/favicon.ico");
  assert.equal(getAssetPath("pagefind/"), "/pagefind/");
  assert.equal(getAssetPath(""), "/");
});
