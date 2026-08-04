"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { emrRenewPrescription } from "@/actions/emr/prescriptions";

/** Renew CTA for ACTIVE/COMPLETED/EXPIRED prescriptions (T126): clones into a new DRAFT. */
export function RenewPrescriptionButton({ prescriptionId }: { prescriptionId: string }) {
  const t = useTranslations("doctor.rx");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function renew() {
    setError(null);
    startTransition(async () => {
      const res = await emrRenewPrescription({ fromPrescriptionId: prescriptionId });
      if (!res.ok) {
        setError(t("renewFailed"));
        return;
      }
      router.push(`/doctor/prescriptions/${res.data.prescriptionId}`);
    });
  }

  return (
    <div className="space-y-2">
      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      <Button type="button" variant="outline" disabled={pending} onClick={renew}>
        {pending ? t("renewing") : t("renew")}
      </Button>
    </div>
  );
}
