"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useTranslations } from "next-intl";
import { WifiOff } from "lucide-react";

const OnlineContext = createContext(true);

function readOnline(): boolean {
  if (typeof navigator === "undefined") return true;
  return navigator.onLine;
}

export function OfflineBanner() {
  const t = useTranslations("doctor.workspace");

  return (
    <div
      role="status"
      className="flex items-center gap-2 border-b border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-900"
    >
      <WifiOff className="h-4 w-4 shrink-0" aria-hidden />
      <span>{t("offlineBanner")}</span>
    </div>
  );
}

export function OfflineProvider({ children }: { children: ReactNode }) {
  const [online, setOnline] = useState(readOnline);

  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    setOnline(readOnline());
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  return (
    <OnlineContext.Provider value={online}>
      {!online ? <OfflineBanner /> : null}
      {children}
    </OnlineContext.Provider>
  );
}

export function useOnline(): boolean {
  return useContext(OnlineContext);
}

export function useRequireOnline(): { online: boolean; offline: boolean } {
  const online = useOnline();
  return { online, offline: !online };
}

export function useOfflineActionGuard(): { disabled: boolean; guard: () => boolean } {
  const { offline } = useRequireOnline();
  const guard = useCallback(() => !offline, [offline]);
  return { disabled: offline, guard };
}
