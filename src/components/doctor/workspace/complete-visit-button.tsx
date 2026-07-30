"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/doctor/shared";
import { completeConsultation } from "@/actions/doctor/schedule";
import { useOfflineActionGuard } from "@/components/doctor/workspace/offline-guard";

export function CompleteVisitButton({ appointmentId }: { appointmentId: string }) {
  const t = useTranslations("doctor.workspace");
  const tc = useTranslations("doctor.common");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const { disabled: offlineDisabled } = useOfflineActionGuard();

  return (
    <>
      <Button variant="soft" disabled={pending || offlineDisabled} onClick={() => setOpen(true)}>
        {t("complete")}
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={t("completeTitle")}
        description={t("completeDescription")}
        confirmLabel={t("completeConfirm")}
        cancelLabel={tc("cancel")}
        loading={pending}
        onConfirm={() => {
          startTransition(async () => {
            const res = await completeConsultation({ appointmentId });
            if (res.ok) router.refresh();
          });
        }}
      />
    </>
  );
}
