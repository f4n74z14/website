import {
  DARK,
  LIGHT,
  THEME_KEY,
  getThemeOverride,
  isTheme,
  resolveTheme,
  type Theme,
} from "@/utils/theme";

const colorSchemeQuery = window.matchMedia("(prefers-color-scheme: dark)");

function getSystemTheme(): Theme {
  return colorSchemeQuery.matches ? DARK : LIGHT;
}

function getStoredTheme(): string | null {
  try {
    return localStorage.getItem(THEME_KEY);
  } catch {
    return null;
  }
}

// Reuse the value already set by the inline FOUC-prevention script if available.
const preloadedTheme = (window as unknown as { __theme?: { value?: string } })
  .__theme?.value;

let themeValue: Theme = isTheme(preloadedTheme)
  ? preloadedTheme
  : resolveTheme(getStoredTheme(), colorSchemeQuery.matches);

function persist(): void {
  const override = getThemeOverride(themeValue, getSystemTheme());
  try {
    if (override) {
      localStorage.setItem(THEME_KEY, override);
    } else {
      localStorage.removeItem(THEME_KEY);
    }
  } catch {
    // Storage may be unavailable in restricted contexts.
  }
  reflect();
}

function reflect(): void {
  const root = document.firstElementChild;
  root?.setAttribute("data-theme", themeValue);
  root?.classList.toggle("dark", themeValue === DARK);
  document.querySelector("#theme-btn")?.setAttribute("aria-label", themeValue);

  const bg = window.getComputedStyle(document.body).backgroundColor;
  document
    .querySelector("meta[name='theme-color']")
    ?.setAttribute("content", bg);
}

reflect();

// Delegated click listener avoids re-binding on every View Transitions swap.
document.addEventListener("click", event => {
  if (!(event.target instanceof Element)) return;
  if (!event.target.closest("#theme-btn")) return;
  themeValue = themeValue === LIGHT ? DARK : LIGHT;
  persist();
});

document.addEventListener("astro:after-swap", reflect);

// Carry the theme-color value across View Transitions to prevent the
// Android navigation bar from flashing during page transitions.
document.addEventListener("astro:before-swap", event => {
  const color = document
    .querySelector("meta[name='theme-color']")
    ?.getAttribute("content");
  if (color) {
    (event as { newDocument: Document }).newDocument
      .querySelector("meta[name='theme-color']")
      ?.setAttribute("content", color);
  }
});

colorSchemeQuery.addEventListener("change", ({ matches }) => {
  themeValue = matches ? DARK : LIGHT;
  persist();
});
