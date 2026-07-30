"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { AuthAlert } from "@/components/auth/auth-alert";
import { listMySessions, revokeMySession, revokeOtherSessions } from "@/actions/auth/sessions";

type SessionRow = {
  id: string;
  lastActiveAt: string;
  expires: string;
  userAgent: string | null;
  rememberMe: boolean;
  isCurrent: boolean;
};

export function SessionsPanel() {
  const t = useTranslations("auth");
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function reload() {
    startTransition(async () => {
      const result = await listMySessions();
      if (!result.ok) {
        setError(t("errors.UNAUTHENTICATED"));
        return;
      }
      setSessions(result.sessions);
    });
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-4">
      {error ? <AuthAlert variant="error">{error}</AuthAlert> : null}
      <Button
        type="button"
        variant="outline"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await revokeOtherSessions();
            reload();
          })
        }
      >
        {t("signOutOthers")}
      </Button>
      <ul className="space-y-3">
        {sessions.map((s) => (
          <li
            key={s.id}
            className="flex flex-col gap-2 rounded-xl border border-outline-variant/30 bg-white p-4 md:flex-row md:items-center md:justify-between"
          >
            <div className="text-sm">
              <p className="font-semibold text-primary">
                {s.isCurrent ? t("currentSession") : t("otherSession")}
                {s.rememberMe ? ` · ${t("rememberMe")}` : ""}
              </p>
              <p className="text-on-surface-variant">{s.userAgent ?? "—"}</p>
              <p className="text-on-surface-variant">
                {t("lastActive")}: {new Date(s.lastActiveAt).toLocaleString()}
              </p>
            </div>
            {!s.isCurrent ? (
              <Button
                size="sm"
                variant="outline"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    await revokeMySession({ sessionId: s.id });
                    reload();
                  })
                }
              >
                {t("revoke")}
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
