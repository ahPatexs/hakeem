"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmReasonDialog } from "@/components/admin/shared/confirm-reason-dialog";
import { disableUserAi } from "@/actions/admin/ai-ops";

export function DisableUserAiForm() {
  const t = useTranslations("admin.ai");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [userId, setUserId] = useState("");
  const [open, setOpen] = useState(false);

  return (
    <section className="rounded-2xl border border-outline-variant/20 p-6">
      <h2 className="mb-4 font-headline text-lg text-primary">{t("disableUserTitle")}</h2>
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-2">
          <Label htmlFor="disable-ai-userId">{t("userId")}</Label>
          <Input
            id="disable-ai-userId"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder={t("userIdPlaceholder")}
            className="max-w-xs"
          />
        </div>
        <Button type="button" variant="outline" disabled={!userId.trim() || pending} onClick={() => setOpen(true)}>
          {t("disableUserSubmit")}
        </Button>
      </div>
      <ConfirmReasonDialog
        open={open}
        onOpenChange={setOpen}
        title={t("disableUserConfirmTitle")}
        confirmLabel={t("disableUserSubmit")}
        minLength={10}
        pending={pending}
        onConfirm={(reason) =>
          startTransition(async () => {
            await disableUserAi({ userId: userId.trim(), reason });
            setOpen(false);
            setUserId("");
            router.refresh();
          })
        }
      />
    </section>
  );
}
