"use client";

import { useEffect } from "react";

const PREFAB_SELECTORS = [
  ".lk-chat",
  ".lk-control-bar",
  ".lk-video-conference",
  ".lk-widget-chat",
  ".lk-chat-form",
];

export function LiveKitPrefabGuard() {
  useEffect(() => {
    const hidePrefabs = () => {
      for (const selector of PREFAB_SELECTORS) {
        document.querySelectorAll(selector).forEach((node) => {
          if (!(node instanceof HTMLElement)) return;
          if (node.closest(".hakeem-visit-chat")) return;
          node.style.setProperty("display", "none", "important");
          node.setAttribute("aria-hidden", "true");
          node.hidden = true;
        });
      }
    };

    hidePrefabs();
    const observer = new MutationObserver(hidePrefabs);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return null;
}