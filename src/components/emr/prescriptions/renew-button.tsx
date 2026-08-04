"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { emrRenewPrescription } from "@/actions/emr/prescriptions";

export function RenewPrescriptionButton({
  prescriptionId,
  enabled,
}: {
  prescriptionId: string;
  enabled: boolean;
}) {
  const t = useTranslations("emr");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (!enabled) return null;

  return (
    <Button
      type="button"
      variant="soft"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          const result = await emrRenewPrescription({ fromPrescriptionId: prescriptionId });
          if (result.ok) {
            router.push(`/doctor/prescriptions/${result.data.prescriptionId}`);
            router.refresh();
          }
        });
      }}
    >
      {t("prescriptions.renew")}
    </Button>
  );
}
