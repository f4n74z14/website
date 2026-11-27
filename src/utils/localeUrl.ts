import { getRelativeLocaleUrl } from "astro:i18n";
import { DEFAULT_LOCALE, type Locale } from "@/i18n/locales";
import { stripBase, stripLocale } from "./withBase";

/**
 * Computes the equivalent URL in `targetLocale` for a given pathname.
 */
export function switchLocalePath(
  pathname: string,
  currentLocale: Locale,
  targetLocale: Locale
): string {
  const pathWithoutBase = stripBase(pathname || "/");
  const logical =
    currentLocale === DEFAULT_LOCALE
      ? pathWithoutBase
      : stripLocale(pathWithoutBase, currentLocale);
  const clean = logical.replace(/^\/+/, "");
  return getRelativeLocaleUrl(targetLocale, clean);
}
