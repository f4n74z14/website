import { isSafeInternalPath } from "@/utils/withBase";

const BACK_URL_KEY = "backUrl";

function getBackUrlKey(): string {
  const lang = document.documentElement.lang.trim();
  return lang ? `${BACK_URL_KEY}:${lang}` : BACK_URL_KEY;
}

export function setBackUrl(url: string): void {
  if (!isSafeInternalPath(url)) return;
  try {
    sessionStorage.setItem(getBackUrlKey(), url);
  } catch {
    // Storage may be unavailable.
  }
}

function syncBackNavigation(): void {
  const mainContent = document.getElementById("main-content");
  const pageBackUrl = mainContent?.dataset.backurl;
  if (pageBackUrl) {
    setBackUrl(pageBackUrl);
  }

  const backButton = document.querySelector<HTMLAnchorElement>("#back-button");
  if (!backButton) return;

  try {
    const stored = sessionStorage.getItem(getBackUrlKey());
    if (isSafeInternalPath(stored)) {
      backButton.href = stored;
    }
  } catch {
    // Storage may be unavailable.
  }
}

// Single capture-phase listener handles mobile menu toggle and skip-to-content before ClientRouter.
document.addEventListener(
  "click",
  event => {
    if (!(event.target instanceof Element)) return;

    const menuBtn = event.target.closest<HTMLButtonElement>("#menu-btn");
    if (menuBtn) {
      const menuItems = document.getElementById("menu-items");
      const menuIcon = document.getElementById("menu-icon");
      const closeIcon = document.getElementById("close-icon");
      if (!menuItems || !menuIcon || !closeIcon) return;

      const isOpen = menuBtn.getAttribute("aria-expanded") === "true";
      const openLabel = menuBtn.dataset.labelOpen ?? "Open menu";
      const closeLabel = menuBtn.dataset.labelClose ?? "Close menu";

      menuBtn.setAttribute("aria-expanded", String(!isOpen));
      menuBtn.setAttribute("aria-label", isOpen ? openLabel : closeLabel);
      menuItems.classList.toggle("hidden");
      menuItems.classList.toggle("grid");
      menuIcon.classList.toggle("hidden");
      closeIcon.classList.toggle("hidden");
      return;
    }

    const skipLink = event.target.closest<HTMLAnchorElement>("#skip-to-content");
    if (
      skipLink &&
      !event.defaultPrevented &&
      !event.metaKey &&
      !event.ctrlKey &&
      !event.shiftKey &&
      event.button === 0
    ) {
      const target = document.getElementById("main-content");
      if (!target) return;
      event.preventDefault();
      target.setAttribute("tabindex", "-1");
      target.addEventListener("blur", () => target.removeAttribute("tabindex"), {
        once: true,
      });
      target.focus();
      target.scrollIntoView();
    }
  },
  { capture: true }
);

syncBackNavigation();
document.addEventListener("astro:after-swap", syncBackNavigation);
