"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { markLabReviewed } from "@/actions/doctor/records";

export function LabReviewButton({ labResultId }: { labResultId: string }) {
  const t = useTranslations("doctor.labs");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-on-primary hover:opacity-90 disabled:opacity-60"
      onClick={() => {
        startTransition(async () => {
          const res = await markLabReviewed({ labResultId });
          if (res.ok) router.refresh();
        });
      }}
    >
      {pending ? t("sharing") : t("markReviewed")}
    </button>
  );
}
