import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_LOCALE,
  LOCALES,
  getContentLocale,
  getLocaleParam,
  getStaticLocalePaths,
  isLocale,
  resolveLocale,
  splitLocaleFromId,
} from "./locales";
import ru from "./lang/ru";
import en from "./lang/en";

test("locale validation and resolution handle supported and unknown locales", () => {
  assert.equal(isLocale("ru"), true);
  assert.equal(isLocale("en"), true);
  assert.equal(isLocale("fr"), false);
  assert.equal(resolveLocale("en"), "en");
  assert.equal(resolveLocale("unknown"), DEFAULT_LOCALE);
  assert.equal(resolveLocale(undefined), DEFAULT_LOCALE);
});

test("getLocaleParam omits prefix for default locale only", () => {
  assert.equal(getLocaleParam("ru"), undefined);
  assert.equal(getLocaleParam("en"), "en");
  assert.deepEqual(
    getStaticLocalePaths().map(p => p.params.locale),
    [undefined, "en"]
  );
});

test("splitLocaleFromId and getContentLocale resolve folder and frontmatter locales", () => {
  assert.deepEqual(splitLocaleFromId("about"), {
    locale: "ru",
    slug: "about",
  });
  assert.deepEqual(splitLocaleFromId("en/about"), {
    locale: "en",
    slug: "about",
  });
  assert.deepEqual(splitLocaleFromId("en/_gaming/post"), {
    locale: "en",
    slug: "_gaming/post",
  });
  assert.equal(
    getContentLocale({ id: "en/about", data: {} }),
    "en"
  );
  assert.equal(
    getContentLocale({ id: "about", data: { lang: "en" } }),
    "en"
  );
});

test("all locale translation dictionaries define identical non-empty keys", () => {
  const dicts = { ru, en };
  assert.deepEqual(Object.keys(dicts).sort(), [...LOCALES].sort());

  const collectKeys = (obj: Record<string, unknown>, prefix = ""): string[] =>
    Object.entries(obj).flatMap(([k, v]) => {
      const path = prefix ? `${prefix}.${k}` : k;
      if (Array.isArray(v)) {
        assert.ok(v.length > 0, `Empty array at ${path}`);
        return [path];
      }
      if (v && typeof v === "object") {
        return collectKeys(v as Record<string, unknown>, path);
      }
      assert.equal(typeof v, "string", `Expected string at ${path}`);
      assert.ok((v as string).trim().length > 0, `Empty string at ${path}`);
      return [path];
    });

  const ruKeys = collectKeys(ru).sort();
  const enKeys = collectKeys(en).sort();
  assert.deepEqual(enKeys, ruKeys);
});
