export type LightboxStrings = {
  zoomImage: string;
  zoomImageGeneral: string;
  imagePreviewGeneral: string;
  imagePreview: string;
  closeImagePreview: string;
};

const prefersReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function initLightbox(
  article: HTMLElement,
  strings: LightboxStrings
): () => void {
  let overlay: HTMLDivElement | null = null;
  let lastFocused: HTMLElement | null = null;
  let removeDragListeners: (() => void) | null = null;

  const rafId = requestAnimationFrame(() => {
    for (const image of article.querySelectorAll("img")) {
      if (image.closest("a")) continue;
      image.setAttribute("role", "button");
      image.setAttribute("tabindex", "0");
      image.setAttribute("aria-haspopup", "dialog");
      image.setAttribute(
        "aria-label",
        image.alt
          ? strings.zoomImage.replace("{{alt}}", () => image.alt)
          : strings.zoomImageGeneral
      );
    }
  });

  function trapFocus(e: KeyboardEvent) {
    if (!overlay) return;
    const focusables = overlay.querySelectorAll<HTMLElement>(
      'a[href], button, [tabindex]:not([tabindex="-1"])'
    );
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape") close();
    else if (e.key === "Tab") trapFocus(e);
  }

  function close() {
    if (!overlay) return;
    const el = overlay;
    overlay = null;
    el.classList.add("pointer-events-none");

    document.removeEventListener("keydown", onKeyDown);
    removeDragListeners?.();
    removeDragListeners = null;
    document.documentElement.style.overflow = "";
    lastFocused?.focus();
    lastFocused = null;

    if (prefersReducedMotion()) {
      el.remove();
      return;
    }
    const remove = () => el.remove();
    el.addEventListener("transitionend", remove, { once: true });
    setTimeout(remove, 250);
    el.classList.remove("opacity-100");
  }

  function open(src: string, alt: string, trigger: HTMLElement | null) {
    if (overlay) return;
    lastFocused =
      trigger ?? (document.activeElement as HTMLElement | null);

    const dialog = document.createElement("div");
    overlay = dialog;
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute(
      "aria-label",
      alt
        ? strings.imagePreview.replace("{{alt}}", () => alt)
        : strings.imagePreviewGeneral
    );
    dialog.className =
      "fixed inset-0 z-50 flex cursor-zoom-out items-center justify-center bg-black/70 backdrop-blur-sm opacity-0 transition-opacity duration-200 motion-reduce:transition-none";

    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.setAttribute("aria-label", strings.closeImagePreview);
    closeButton.className =
      "absolute end-4 top-4 z-1 flex size-11 items-center justify-center rounded bg-black/50 text-3xl leading-none text-white";
    closeButton.textContent = "✕";
    closeButton.addEventListener("click", close);

    const image = document.createElement("img");
    image.src = src;
    image.alt = "";
    image.className =
      "max-h-[90dvh] max-w-[90dvw] cursor-default object-contain transition-transform duration-100 ease-out motion-reduce:transition-none data-[zoom=drag]:cursor-grabbing data-[zoom=drag]:transition-none data-[zoom=in]:cursor-grab";

    dialog.append(closeButton, image);

    let currentScale = 1;
    let translateX = 0;
    let translateY = 0;
    let initialDist = 0;
    let initialScale = 1;
    let panStartX = 0;
    let panStartY = 0;
    let panStartTranslateX = 0;
    let panStartTranslateY = 0;
    let lastTapTime = 0;

    dialog.addEventListener("click", e => {
      if (e.target === dialog && currentScale <= 1) close();
    });

    function applyTransform() {
      image.style.transform = `scale(${currentScale}) translate(${translateX}px, ${translateY}px)`;
      dialog.classList.toggle("cursor-zoom-out", currentScale <= 1);
    }

    function resetTransform() {
      currentScale = 1;
      translateX = 0;
      translateY = 0;
      image.style.transform = "";
      image.removeAttribute("data-zoom");
      dialog.classList.add("cursor-zoom-out");
    }

    function clampTranslate() {
      const maxX = Math.max(
        0,
        (image.clientWidth - dialog.clientWidth / currentScale) / 2
      );
      const maxY = Math.max(
        0,
        (image.clientHeight - dialog.clientHeight / currentScale) / 2
      );
      translateX = Math.min(maxX, Math.max(-maxX, translateX));
      translateY = Math.min(maxY, Math.max(-maxY, translateY));
    }

    function zoomToPoint(clientX: number, clientY: number, oldScale: number) {
      const ox = dialog.clientWidth / 2;
      const oy = dialog.clientHeight / 2;
      translateX =
        (clientX - ox) * (1 / currentScale - 1 / oldScale) + translateX;
      translateY =
        (clientY - oy) * (1 / currentScale - 1 / oldScale) + translateY;
      clampTranslate();
      applyTransform();
    }

    dialog.addEventListener(
      "touchstart",
      e => {
        const t = e.touches;
        if (t.length === 2) {
          image.setAttribute("data-zoom", "drag");
          initialDist = Math.hypot(
            t[1].clientX - t[0].clientX,
            t[1].clientY - t[0].clientY
          );
          initialScale = currentScale;
        } else if (t.length === 1) {
          const now = Date.now();
          if (now - lastTapTime < 300) {
            e.preventDefault();
            if (currentScale > 1) {
              resetTransform();
            } else {
              currentScale = 2;
              translateX = 0;
              translateY = 0;
              applyTransform();
              image.setAttribute("data-zoom", "in");
            }
            lastTapTime = 0;
          } else {
            lastTapTime = now;
            if (currentScale > 1) image.setAttribute("data-zoom", "drag");
          }
          panStartX = t[0].clientX;
          panStartY = t[0].clientY;
          panStartTranslateX = translateX;
          panStartTranslateY = translateY;
        }
      },
      { passive: false }
    );

    dialog.addEventListener(
      "touchmove",
      e => {
        const t = e.touches;
        if (t.length === 2) {
          e.preventDefault();
          const dist = Math.hypot(
            t[1].clientX - t[0].clientX,
            t[1].clientY - t[0].clientY
          );
          const oldScale = currentScale;
          currentScale = Math.min(
            4,
            Math.max(1, initialScale * (dist / initialDist))
          );
          zoomToPoint(
            (t[0].clientX + t[1].clientX) / 2,
            (t[0].clientY + t[1].clientY) / 2,
            oldScale
          );
        } else if (t.length === 1) {
          e.preventDefault();
          if (currentScale > 1) {
            image.setAttribute("data-zoom", "drag");
            translateX =
              panStartTranslateX + (t[0].clientX - panStartX) / currentScale;
            translateY =
              panStartTranslateY + (t[0].clientY - panStartY) / currentScale;
            clampTranslate();
            applyTransform();
          }
        }
      },
      { passive: false }
    );

    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length !== 0) return;
      if (currentScale <= 1.05) resetTransform();
      else image.setAttribute("data-zoom", "in");
    };
    dialog.addEventListener("touchend", onTouchEnd);
    dialog.addEventListener("touchcancel", onTouchEnd);

    dialog.addEventListener(
      "wheel",
      e => {
        e.preventDefault();
        const oldScale = currentScale;
        currentScale = Math.min(
          4,
          Math.max(1, currentScale * (1 - e.deltaY * 0.001))
        );
        if (currentScale <= 1.05) {
          resetTransform();
        } else {
          image.setAttribute("data-zoom", "in");
          zoomToPoint(e.clientX, e.clientY, oldScale);
        }
      },
      { passive: false }
    );

    let isMouseDown = false;
    let mouseStartX = 0;
    let mouseStartY = 0;

    dialog.addEventListener("mousedown", e => {
      if (e.button !== 0 || currentScale <= 1) return;
      if ((e.target as Element).closest("button")) return;
      isMouseDown = true;
      mouseStartX = e.clientX;
      mouseStartY = e.clientY;
      panStartTranslateX = translateX;
      panStartTranslateY = translateY;
      image.setAttribute("data-zoom", "drag");
      e.preventDefault();
    });

    const onMouseMove = (e: MouseEvent) => {
      if (!isMouseDown) return;
      translateX =
        panStartTranslateX + (e.clientX - mouseStartX) / currentScale;
      translateY =
        panStartTranslateY + (e.clientY - mouseStartY) / currentScale;
      clampTranslate();
      applyTransform();
    };

    const onMouseUp = () => {
      if (!isMouseDown) return;
      isMouseDown = false;
      if (currentScale > 1) image.setAttribute("data-zoom", "in");
      else image.removeAttribute("data-zoom");
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    removeDragListeners = () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };

    document.body.appendChild(dialog);
    document.documentElement.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);

    requestAnimationFrame(() => dialog.classList.add("opacity-100"));
    closeButton.focus();
  }

  function triggerFromEvent(e: Event): HTMLImageElement | null {
    const target = e.target;
    if (!(target instanceof Element)) return null;
    const image = target.closest("img");
    if (!image || !article.contains(image) || image.closest("a")) return null;
    return image;
  }

  const onClick = (e: MouseEvent) => {
    const image = triggerFromEvent(e);
    if (!image) return;
    e.preventDefault();
    open(image.currentSrc || image.src, image.alt, image);
  };

  const onKeydownArticle = (e: KeyboardEvent) => {
    if (e.key !== "Enter" && e.key !== " " && e.key !== "Spacebar") return;
    const image = triggerFromEvent(e);
    if (!image) return;
    e.preventDefault();
    open(image.currentSrc || image.src, image.alt, image);
  };

  article.addEventListener("click", onClick);
  article.addEventListener("keydown", onKeydownArticle);

  return () => {
    cancelAnimationFrame(rafId);
    close();
    article.removeEventListener("click", onClick);
    article.removeEventListener("keydown", onKeydownArticle);
  };
}
