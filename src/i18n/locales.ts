export const LOCALES = ["ru", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "ru";

export const LOCALE_LABELS: Record<
  Locale,
  { code: string; nativeName: string }
> = {
  ru: { code: "RU", nativeName: "Русский" },
  en: { code: "EN", nativeName: "English" },
};

export function isLocale(value: string | undefined | null): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

export function resolveLocale(locale: string | undefined | null): Locale {
  return isLocale(locale) ? locale : DEFAULT_LOCALE;
}

export function getLocaleParam(locale: Locale): string | undefined {
  return locale === DEFAULT_LOCALE ? undefined : locale;
}

export function getStaticLocalePaths() {
  return LOCALES.map(locale => ({
    params: { locale: getLocaleParam(locale) },
    props: { locale },
  }));
}

/**
 * Splits an optional non-default locale prefix from a content entry ID.
 * e.g. "en/about" -> { locale: "en", slug: "about" }
 *      "about"    -> { locale: "ru", slug: "about" }
 */
export function splitLocaleFromId(id: string): {
  locale: Locale;
  slug: string;
} {
  const [first, ...rest] = id.split("/");
  if (isLocale(first) && first !== DEFAULT_LOCALE && rest.length > 0) {
    return { locale: first, slug: rest.join("/") };
  }
  return { locale: DEFAULT_LOCALE, slug: id };
}

export function getContentLocale(entry: {
  id: string;
  data: { lang?: Locale };
}): Locale {
  return entry.data.lang ?? splitLocaleFromId(entry.id).locale;
}
