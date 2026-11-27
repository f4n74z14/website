import { initLightbox, type LightboxStrings } from "./lightbox";

type PostStrings = LightboxStrings & {
  copy: string;
  copied: string;
  zoomImageGeneral: string;
  linkToSection: string;
  footnoteLabel: string;
};

const DEFAULT_STRINGS: PostStrings = {
  copy: "Copy",
  copied: "Copied",
  zoomImage: "Zoom image: {{alt}}",
  zoomImageGeneral: "Zoom image",
  imagePreviewGeneral: "Image preview",
  imagePreview: "Image preview: {{alt}}",
  closeImagePreview: "Close preview",
  linkToSection: "Link to {{title}}",
  footnoteLabel: "Footnotes",
};

function readPostStrings(article: HTMLElement): PostStrings {
  const raw = article.dataset.i18n;
  if (!raw) return DEFAULT_STRINGS;
  try {
    return { ...DEFAULT_STRINGS, ...(JSON.parse(raw) as Partial<PostStrings>) };
  } catch {
    return DEFAULT_STRINGS;
  }
}

function addHeadingLinks(
  article: HTMLElement,
  linkTemplate: string,
  footnoteLabel: string
): void {
  const headings = article.querySelectorAll<HTMLElement>("h2, h3, h4, h5, h6");
  for (const heading of headings) {
    if (!heading.id || heading.querySelector(".heading-link")) continue;
    if (
      heading.id === "footnote-label" &&
      heading.firstChild?.nodeType === Node.TEXT_NODE
    ) {
      heading.firstChild.textContent = footnoteLabel;
    }
    heading.classList.add("group");

    const link = document.createElement("a");
    link.className =
      "heading-link ms-2 no-underline opacity-75 md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100";
    link.href = `#${encodeURIComponent(heading.id)}`;
    link.setAttribute(
      "aria-label",
      linkTemplate.replace("{{title}}", () => heading.textContent.trim())
    );

    const span = document.createElement("span");
    span.ariaHidden = "true";
    span.textContent = "#";
    link.appendChild(span);
    heading.appendChild(link);
  }
}

function attachCopyButtons(
  article: HTMLElement,
  copyLabel: string,
  copiedLabel: string
): void {
  for (const codeBlock of article.querySelectorAll("pre")) {
    if (codeBlock.querySelector(".copy-code")) continue;

    const wrapper = document.createElement("div");
    wrapper.style.position = "relative";

    const hasFileNameOffset =
      getComputedStyle(codeBlock)
        .getPropertyValue("--file-name-offset")
        .trim() !== "";
    const topClass = hasFileNameOffset
      ? "top-(--file-name-offset)"
      : "-top-3";

    const copyButton = document.createElement("button");
    copyButton.type = "button";
    copyButton.className = `copy-code absolute end-3 ${topClass} rounded bg-muted border border-muted px-2 py-1 text-xs leading-4 text-foreground font-medium transition-transform duration-150 active:scale-95 motion-reduce:transition-none motion-reduce:active:scale-100`;
    copyButton.textContent = copyLabel;

    codeBlock.setAttribute("tabindex", "0");
    codeBlock.appendChild(copyButton);
    codeBlock.parentNode?.insertBefore(wrapper, codeBlock);
    wrapper.appendChild(codeBlock);

    copyButton.addEventListener("click", async () => {
      const text = codeBlock.querySelector("code")?.innerText ?? "";
      await navigator.clipboard.writeText(text);
      copyButton.textContent = copiedLabel;
      setTimeout(() => {
        copyButton.textContent = copyLabel;
      }, 700);
    });
  }
}

function scrollToTop(): void {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.scrollTo({ left: 0, top: 0, behavior: reduced ? "auto" : "smooth" });
}

function centerActiveTocItem(list: HTMLElement | null, smooth: boolean): void {
  if (!list || list.scrollHeight <= list.clientHeight) return;
  const active = list.querySelector<HTMLElement>("[aria-current]");
  if (!active) return;

  const top = active.offsetTop - list.clientHeight / 2;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  list.scrollTo({ top, behavior: smooth && !reduced ? "smooth" : "auto" });
}

let cleanupPost: (() => void) | undefined;

function initPostPage(): void {
  cleanupPost?.();
  cleanupPost = undefined;

  const article = document.getElementById("article");
  if (!article) return;

  const strings = readPostStrings(article);
  addHeadingLinks(article, strings.linkToSection, strings.footnoteLabel);
  attachCopyButtons(article, strings.copy, strings.copied);
  const cleanupLightbox = initLightbox(article, strings);

  // Shared scroll + resize state for reading progress bar, FAB, and TOC scroll-spy.
  const root = document.documentElement;
  const progressBar = document.getElementById("myBar");
  const fab = document.getElementById("post-fab");
  const fabButton = fab?.querySelector<HTMLButtonElement>("button") ?? null;
  const fabProgress = fab?.querySelector<HTMLElement>(".post-fab-progress") ?? null;
  const popover = document.getElementById("toc-popover");
  const sideToc = document.querySelector<HTMLElement>(".toc-side > nav");
  const tocLinks = Array.from(
    document.querySelectorAll<HTMLAnchorElement>("[data-toc-nav] a[href^='#']")
  );
  const headings = [
    ...new Set(tocLinks.map(link => decodeURIComponent(link.hash.slice(1)))),
  ]
    .map(id => document.getElementById(id))
    .filter((h): h is HTMLElement => h !== null);

  const opensToc = fabButton?.hasAttribute("data-has-toc") ?? false;
  const READING_LINE = 96;
  let lastVisible: boolean | null = null;
  let activeId: string | null = null;
  let frame = 0;

  const closePopover = () => {
    if (popover?.hidePopover && popover.matches(":popover-open")) {
      popover.hidePopover();
    }
  };

  function updateAll(): void {
    frame = 0;
    const scrollTotal = root.scrollHeight - root.clientHeight;
    const ratio =
      scrollTotal > 0 ? Math.min(1, Math.max(0, root.scrollTop / scrollTotal)) : 0;
    const pct = `${ratio * 100}%`;

    if (progressBar) {
      progressBar.style.transform = `scaleX(${ratio})`;
    }

    if (fab && fabProgress) {
      fab.toggleAttribute("data-side-toc-hidden", sideToc?.offsetWidth === 0);
      if (fab.offsetWidth === 0) closePopover();
      fabProgress.style.setProperty("--progress", pct);

      const isVisible = opensToc || ratio > 0.3;
      if (isVisible !== lastVisible) {
        fab.toggleAttribute("data-visible", isVisible);
        lastVisible = isVisible;
      }
    }

    if (tocLinks.length > 0 && headings.length > 0) {
      const atBottom =
        root.scrollTop + window.innerHeight >= root.scrollHeight - 2;
      let current: HTMLElement | null = null;
      for (const heading of headings) {
        if (heading.getBoundingClientRect().top > READING_LINE) break;
        current = heading;
      }
      if (atBottom) current = headings[headings.length - 1] ?? current;

      const id = current?.id ?? null;
      if (id !== activeId) {
        activeId = id;
        for (const link of tocLinks) {
          const isActive = decodeURIComponent(link.hash.slice(1)) === id;
          if (isActive) {
            link.setAttribute("aria-current", "true");
            centerActiveTocItem(
              link.closest<HTMLElement>(":is(.toc-side, .toc-popover) nav > ol"),
              true
            );
          } else {
            link.removeAttribute("aria-current");
          }
        }
      }
    }
  }

  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(updateAll);
  };

  const onFabClick = () => {
    if (!opensToc) scrollToTop();
  };

  const onDocClick = (e: Event) => {
    const target = e.target;
    if (!(target instanceof Element)) return;
    if (target.closest("[data-back-to-top]")) {
      scrollToTop();
      closePopover();
    } else if (target.closest(".toc-popover a")) {
      closePopover();
    }
  };

  const onPopoverToggle = (e: Event) => {
    if ((e as ToggleEvent).newState !== "open") return;
    centerActiveTocItem(
      popover?.querySelector<HTMLElement>("nav > ol") ?? null,
      false
    );
  };

  fabButton?.addEventListener("click", onFabClick);
  document.addEventListener("click", onDocClick);
  popover?.addEventListener("toggle", onPopoverToggle);
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule, { passive: true });
  schedule();

  cleanupPost = () => {
    cleanupLightbox();
    fabButton?.removeEventListener("click", onFabClick);
    document.removeEventListener("click", onDocClick);
    popover?.removeEventListener("toggle", onPopoverToggle);
    window.removeEventListener("scroll", schedule);
    window.removeEventListener("resize", schedule);
    cancelAnimationFrame(frame);
  };
}

document.addEventListener("astro:page-load", initPostPage);
document.addEventListener("astro:before-swap", () => cleanupPost?.());
