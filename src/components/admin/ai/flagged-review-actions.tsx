"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { ConfirmReasonDialog } from "@/components/admin/shared/confirm-reason-dialog";
import { reviewFlaggedConversation } from "@/actions/admin/ai-ops";

export function FlaggedReviewActions({ flagId }: { flagId: string }) {
  const t = useTranslations("admin.ai");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button size="sm" variant="outline" disabled={pending} onClick={() => setOpen(true)}>
        {t("reviewFlag")}
      </Button>
      <ConfirmReasonDialog
        open={open}
        onOpenChange={setOpen}
        title={t("reviewFlagTitle")}
        confirmLabel={t("reviewFlag")}
        minLength={10}
        pending={pending}
        onConfirm={(note) =>
          startTransition(async () => {
            await reviewFlaggedConversation({ id: flagId, note });
            setOpen(false);
            router.refresh();
          })
        }
      />
    </>
  );
}
