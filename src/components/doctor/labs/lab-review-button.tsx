"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { markLabReviewed } from "@/actions/doctor/records";

export function LabReviewButton({ labResultId }: { labResultId: string }) {
  const t = useTranslations("doctor.labs");
  const tc = useTranslations("doctor.common");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          const res = await markLabReviewed({ labResultId });
          if (res.ok) router.refresh();
        });
      }}
    >
      {pending ? tc("saving") : t("markReviewed")}
    </Button>
  );
}
