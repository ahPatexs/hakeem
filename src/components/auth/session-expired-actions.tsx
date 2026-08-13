"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "@/i18n/routing";
import { Button } from "@/components/ui/button";

/**
 * If a refresh cookie exists, silently mint a new session and send the user home.
 * Otherwise clear stale auth cookies and navigate to login (avoids login↔expired loop).
 */
export function SessionExpiredActions({
  signInLabel,
  checkingLabel = "…",
  homeHref = "/patient",
}: {
  signInLabel: string;
  checkingLabel?: string;
  homeHref?: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<"checking" | "failed">("checking");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/auth/refresh", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
        });
        if (cancelled) return;
        if (res.ok) {
          router.replace(homeHref);
          return;
        }
        // Failed refresh responses clear cookies; ensure a second clear for safety.
        await fetch("/api/auth/clear-session", {
          method: "POST",
          credentials: "same-origin",
        }).catch(() => undefined);
      } catch {
        /* fall through */
      }
      if (!cancelled) setStatus("failed");
    })();
    return () => {
      cancelled = true;
    };
  }, [homeHref, router]);

  function goToLogin() {
    startTransition(async () => {
      try {
        await fetch("/api/auth/clear-session", {
          method: "POST",
          credentials: "same-origin",
        });
      } catch {
        /* still navigate */
      }
      router.replace("/login");
    });
  }

  if (status === "checking") {
    return <p className="text-center text-sm text-on-surface-variant">{checkingLabel}</p>;
  }

  return (
    <Button type="button" className="w-full" disabled={pending} onClick={goToLogin}>
      {signInLabel}
    </Button>
  );
}
