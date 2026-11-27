import type { ResolvedAstroPaperConfig } from "@/types/config";
import { DEFAULT_LOCALE, resolveLocale } from "@/i18n/locales";
import { getAssetPath } from "./withBase";

const publicFiles = import.meta.glob("/public/*", {
  eager: false,
  query: "?url",
});

function existsInPublic(filename: string): boolean {
  return `/public/${filename}` in publicFiles;
}

/**
 * Resolves the absolute OG image path used for pages/posts.
 *
 * Security note: `site.ogImage` must be a single filename under `public/` to avoid
 * path traversal or referencing arbitrary files.
 *
 * Behavior:
 * - When `features.dynamicOgImage` is enabled, prefers `public/{site.ogImage}` when present,
 *   otherwise falls back to the generated `/og.png`.
 * - When disabled, requires `public/{site.ogImage}` to exist.
 */
export function resolveDefaultOgImagePath(
  config: ResolvedAstroPaperConfig,
  locale?: string
): string {
  const filename = config.site.ogImage;
  if (
    filename.includes("..") ||
    filename.includes("/") ||
    filename.includes("\\")
  ) {
    throw new Error(
      `site.ogImage must be a single filename in public/ (e.g. "default-og.jpg"), got "${filename}"`
    );
  }

  if (config.features.dynamicOgImage) {
    if (existsInPublic(filename)) return getAssetPath(filename);
    const resolved = resolveLocale(locale);
    return resolved === DEFAULT_LOCALE
      ? getAssetPath("og.png")
      : getAssetPath(`${resolved}/og.png`);
  }

  if (!existsInPublic(filename)) {
    throw new Error(
      `AstroPaper: missing public/${filename}. Add that file, or set site.ogImage to an existing file under public/, or enable features.dynamicOgImage to fall back to /og.png.`
    );
  }

  return getAssetPath(filename);
}
