"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { ConfirmReasonDialog } from "@/components/admin/shared/confirm-reason-dialog";
import { cancelAppointmentAdmin, flagAppointmentAdmin } from "@/actions/admin/appointments";

export function AppointmentOpsActions({
  appointmentId,
  status,
}: {
  appointmentId: string;
  status: string;
}) {
  const t = useTranslations("admin.appointments.actions");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [dialog, setDialog] = useState<"cancel" | "flag" | null>(null);

  const cancellable = ["CONFIRMED", "CHECKED_IN", "HELD"].includes(status);

  return (
    <div className="flex gap-2">
      {cancellable ? (
        <Button type="button" variant="outline" className="border-warm-coral text-warm-coral" onClick={() => setDialog("cancel")}>
          {t("cancel")}
        </Button>
      ) : null}
      <Button variant="outline" onClick={() => setDialog("flag")}>
        {t("flag")}
      </Button>

      <ConfirmReasonDialog
        open={dialog === "cancel"}
        onOpenChange={(o) => !o && setDialog(null)}
        title={t("cancelTitle")}
        confirmLabel={t("cancel")}
        pending={pending}
        onConfirm={(reason) =>
          startTransition(async () => {
            await cancelAppointmentAdmin({ appointmentId, reason });
            setDialog(null);
            router.refresh();
          })
        }
      />
      <ConfirmReasonDialog
        open={dialog === "flag"}
        onOpenChange={(o) => !o && setDialog(null)}
        title={t("flagTitle")}
        confirmLabel={t("flag")}
        pending={pending}
        onConfirm={(reason) =>
          startTransition(async () => {
            await flagAppointmentAdmin({ appointmentId, reason });
            setDialog(null);
            router.refresh();
          })
        }
      />
    </div>
  );
}
