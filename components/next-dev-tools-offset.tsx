"use client";

import { useEffect } from "react";

const DEV_TOOLS_OFFSET_PX = 30;
const DEV_TOOLS_LEFT_OFFSET_PX = 6;
const DEV_TOOLS_BADGE_SIZE_PX = 18;
const DEV_TOOLS_MARK_SCALE = 0.25;

export function NextDevToolsOffset() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;

    const applyOffset = () => {
      const portals = document.querySelectorAll("nextjs-portal");

      portals.forEach((portal) => {
        const shadowRoot = portal.shadowRoot;
        if (!shadowRoot) return;

        const badgeRoot = shadowRoot.querySelector<HTMLElement>("[data-next-badge-root]");
        const triggerButton = shadowRoot.querySelector<HTMLElement>("[data-nextjs-dev-tools-button]");
        const nextMark = shadowRoot.querySelector<HTMLElement>("[data-next-mark]");
        if (!badgeRoot || !triggerButton || !nextMark) return;

        badgeRoot.style.marginBottom = `${DEV_TOOLS_OFFSET_PX}px`;
        badgeRoot.style.marginLeft = `-${DEV_TOOLS_LEFT_OFFSET_PX}px`;
        badgeRoot.style.setProperty("--size", `${DEV_TOOLS_BADGE_SIZE_PX}px`);
        nextMark.style.transform = `scale(${DEV_TOOLS_MARK_SCALE})`;
        nextMark.style.transformOrigin = "center";
      });
    };

    applyOffset();

    const observer = new MutationObserver(() => {
      applyOffset();
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }, []);

  return null;
}
