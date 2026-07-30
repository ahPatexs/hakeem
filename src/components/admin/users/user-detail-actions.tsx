"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { ConfirmReasonDialog } from "@/components/admin/shared/confirm-reason-dialog";
import {
  suspendUser,
  reinstateUser,
  deactivateUser,
  revokeUserSessions,
  unlockUserAdmin,
} from "@/actions/admin/users";

export function UserDetailActions({ userId, status }: { userId: string; status: string }) {
  const t = useTranslations("admin.users.actions");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [dialog, setDialog] = useState<"suspend" | "deactivate" | null>(null);

  function run(action: (input: { userId: string; reason?: string }) => Promise<{ ok: boolean }>, reason?: string) {
    startTransition(async () => {
      const payload = reason ? { userId, reason } : { userId };
      const result = await action(payload);
      if (result.ok) router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      {status === "ACTIVE" ? (
        <>
          <Button type="button" variant="outline" className="border-warm-coral text-warm-coral" onClick={() => setDialog("suspend")}>
            {t("suspend")}
          </Button>
          <Button type="button" variant="outline" onClick={() => setDialog("deactivate")}>
            {t("deactivate")}
          </Button>
        </>
      ) : (
        <Button type="button" onClick={() => run(reinstateUser, "Reinstated by administrator after review.")}>
          {t("reinstate")}
        </Button>
      )}
      <Button type="button" variant="outline" disabled={pending} onClick={() => run(unlockUserAdmin)}>
        {t("unlock")}
      </Button>
      <Button type="button" variant="outline" disabled={pending} onClick={() => run(revokeUserSessions)}>
        {t("revokeSessions")}
      </Button>

      <ConfirmReasonDialog
        open={dialog === "suspend"}
        onOpenChange={(o) => !o && setDialog(null)}
        title={t("suspendTitle")}
        confirmLabel={t("suspend")}
        pending={pending}
        onConfirm={(reason) => {
          run(suspendUser, reason);
          setDialog(null);
        }}
      />
      <ConfirmReasonDialog
        open={dialog === "deactivate"}
        onOpenChange={(o) => !o && setDialog(null)}
        title={t("deactivateTitle")}
        confirmLabel={t("deactivate")}
        pending={pending}
        onConfirm={(reason) => {
          run(deactivateUser, reason);
          setDialog(null);
        }}
      />
    </div>
  );
}
