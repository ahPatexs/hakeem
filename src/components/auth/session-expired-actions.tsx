"use client";

import { useEffect, useState } from "react";
import { useRouter } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/routing";

/**
 * If a refresh cookie exists, silently mint a new session and send the user home.
 * Otherwise show the sign-in CTA.
 */
export function SessionExpiredActions({
  signInLabel,
  homeHref = "/patient",
}: {
  signInLabel: string;
  homeHref?: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<"checking" | "failed">("checking");

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
      } catch {
        /* fall through */
      }
      if (!cancelled) setStatus("failed");
    })();
    return () => {
      cancelled = true;
    };
  }, [homeHref, router]);

  if (status === "checking") {
    return <p className="text-center text-sm text-muted-foreground">…</p>;
  }

  return (
    <Button asChild className="w-full">
      <Link href="/login">{signInLabel}</Link>
    </Button>
  );
}
