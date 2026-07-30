"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { ConfirmReasonDialog } from "@/components/admin/shared/confirm-reason-dialog";
import { approveDoctor, rejectDoctor } from "@/actions/admin/doctors";

export function DoctorQueueActions({
  userId,
  approval,
  locale,
}: {
  userId: string;
  approval: string | null;
  locale: string;
}) {
  const t = useTranslations("admin.doctors.actions");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [rejectOpen, setRejectOpen] = useState(false);

  if (approval !== "PENDING_APPROVAL") {
    return (
      <a href={`/${locale}/admin/doctors/${userId}`} className="text-sm text-med-green hover:underline">
        {t("view")}
      </a>
    );
  }

  return (
    <div className="flex gap-2">
      <Button
        size="sm"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await approveDoctor({ userId, locale: locale as "en" | "ar" });
            router.refresh();
          })
        }
      >
        {t("approve")}
      </Button>
      <Button size="sm" variant="outline" disabled={pending} onClick={() => setRejectOpen(true)}>
        {t("reject")}
      </Button>

      <ConfirmReasonDialog
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        title={t("rejectTitle")}
        confirmLabel={t("reject")}
        minLength={10}
        pending={pending}
        onConfirm={(reason) =>
          startTransition(async () => {
            await rejectDoctor({ userId, reason });
            setRejectOpen(false);
            router.refresh();
          })
        }
      />
    </div>
  );
}
