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
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <Button size="sm" variant="outline" disabled={pending} onClick={() => setOpen(true)}>
        {t("reviewFlag")}
      </Button>
      {error ? <p className="text-xs text-warm-coral">{error}</p> : null}
      <ConfirmReasonDialog
        open={open}
        onOpenChange={setOpen}
        title={t("reviewFlagTitle")}
        confirmLabel={t("reviewFlag")}
        minLength={10}
        pending={pending}
        onConfirm={(note) =>
          startTransition(async () => {
            setError(null);
            const res = await reviewFlaggedConversation({ id: flagId, note });
            if (!res.ok) {
              setError(t("actionError"));
              return;
            }
            setOpen(false);
            router.refresh();
          })
        }
      />
    </>
  );
}
