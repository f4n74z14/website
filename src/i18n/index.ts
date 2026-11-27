import type { UIStrings } from "./types";
import { DEFAULT_LOCALE, resolveLocale } from "./locales";

export { tplStr } from "./format";
export {
  DEFAULT_LOCALE,
  LOCALES,
  LOCALE_LABELS,
  getContentLocale,
  getLocaleParam,
  getStaticLocalePaths,
  isLocale,
  resolveLocale,
  splitLocaleFromId,
  type Locale,
} from "./locales";

const modules = import.meta.glob<{ default: UIStrings }>("./lang/*.ts", {
  eager: true,
});

const translations: Record<string, UIStrings> = {};
for (const [path, mod] of Object.entries(modules)) {
  const locale = path.slice("./lang/".length, -".ts".length);
  translations[locale] = mod.default;
}

type ResolvedStrings = { [K in keyof UIStrings]: Required<UIStrings[K]> };

/**
 * Returns UI strings for the given locale, falling back to DEFAULT_LOCALE.
 */
export function useTranslations(locale?: string): ResolvedStrings {
  const resolved = resolveLocale(locale);
  const t = translations[resolved] ?? translations[DEFAULT_LOCALE];
  return {
    ...t,
    post: { tableOfContents: "Table of contents", ...t.post },
    a11y: { skipTableOfContents: "Skip table of contents", ...t.a11y },
  };
}
