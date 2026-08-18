"use client";

import { useEffect } from "react";

const PREFAB_SELECTORS = [
  ".lk-chat",
  ".lk-control-bar",
  ".lk-video-conference",
  ".lk-widget-chat",
  ".lk-chat-form",
];

export function LiveKitPrefabGuard({ rootSelector = ".hakeem-video-shell" }: { rootSelector?: string }) {
  useEffect(() => {
    const root = document.querySelector(rootSelector);
    if (!root) return;

    const hidePrefabs = () => {
      for (const selector of PREFAB_SELECTORS) {
        root.querySelectorAll(selector).forEach((node) => {
          if (!(node instanceof HTMLElement)) return;
          node.style.setProperty("display", "none", "important");
          node.setAttribute("aria-hidden", "true");
          node.hidden = true;
        });
      }
    };

    hidePrefabs();
    const observer = new MutationObserver(hidePrefabs);
    observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [rootSelector]);

  return null;
}
