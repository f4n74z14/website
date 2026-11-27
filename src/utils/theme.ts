export const THEME_KEY = "theme";
export const LIGHT = "light";
export const DARK = "dark";

export type Theme = typeof LIGHT | typeof DARK;

export function isTheme(value: string | null | undefined): value is Theme {
  return value === LIGHT || value === DARK;
}

export function resolveTheme(
  stored: string | null | undefined,
  prefersDark: boolean
): Theme {
  if (isTheme(stored)) return stored;
  return prefersDark ? DARK : LIGHT;
}

/**
 * Returns the theme to persist as an explicit user override, or `null` when
 * the chosen theme matches the system preference so any existing override can
 * be removed.
 */
export function getThemeOverride(
  theme: Theme,
  systemTheme: Theme
): Theme | null {
  return theme === systemTheme ? null : theme;
}
