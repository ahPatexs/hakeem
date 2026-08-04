"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { inviteAdmin, assignRole } from "@/actions/auth/admin";

const ROLES = ["PATIENT", "DOCTOR", "ADMIN"] as const;

export function RolesAdminForms() {
  const t = useTranslations("admin.roles");
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmAssign, setConfirmAssign] = useState<{ userId: string; role: (typeof ROLES)[number] } | null>(null);

  function run(action: () => Promise<{ ok: boolean; message?: string; code?: string }>) {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        setMessage(result.message ?? t("success"));
        router.refresh();
      } else {
        setError(result.code ?? "UNKNOWN");
      }
    });
  }

  return (
    <div className="space-y-8">
      {message ? <p className="text-sm text-med-green">{message}</p> : null}
      {error ? <p className="text-sm text-warm-coral">{error}</p> : null}

      <section className="rounded-2xl border border-outline-variant/20 p-6">
        <h2 className="mb-4 font-headline text-lg text-primary">{t("inviteTitle")}</h2>
        <form
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            run(() =>
              inviteAdmin({
                email: String(fd.get("email") ?? ""),
                name: String(fd.get("name") ?? ""),
                locale: locale as "en" | "ar",
              }),
            );
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="invite-name">{t("name")}</Label>
            <Input id="invite-name" name="name" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="invite-email">{t("email")}</Label>
            <Input id="invite-email" name="email" type="email" required />
          </div>
          <div className="flex items-end">
            <Button type="submit" disabled={pending}>
              {t("inviteSubmit")}
            </Button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-outline-variant/20 p-6">
        <h2 className="mb-4 font-headline text-lg text-primary">{t("assignTitle")}</h2>
        <form
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const userId = String(fd.get("userId") ?? "").trim();
            const role = String(fd.get("role") ?? "") as (typeof ROLES)[number];
            if (!userId || !ROLES.includes(role)) return;
            setConfirmAssign({ userId, role });
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="assign-userId">{t("userId")}</Label>
            <Input id="assign-userId" name="userId" required placeholder={t("userIdPlaceholder")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="assign-role">{t("role")}</Label>
            <select
              id="assign-role"
              name="role"
              required
              className="h-10 w-full rounded-lg border border-outline-variant/30 bg-surface-container-low px-3 text-sm"
              defaultValue="PATIENT"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <Button type="submit" variant="outline" disabled={pending}>
              {t("assignSubmit")}
            </Button>
          </div>
        </form>
      </section>

      <Dialog open={confirmAssign !== null} onOpenChange={(o) => !o && setConfirmAssign(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("assignConfirmTitle")}</DialogTitle>
            <DialogDescription>
              {confirmAssign
                ? t("assignConfirmBody", { userId: confirmAssign.userId, role: confirmAssign.role })
                : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setConfirmAssign(null)}>
              {t("cancel")}
            </Button>
            <Button
              type="button"
              disabled={pending}
              onClick={() => {
                if (!confirmAssign) return;
                const { userId, role } = confirmAssign;
                setConfirmAssign(null);
                run(() => assignRole({ userId, role }));
              }}
            >
              {t("assignConfirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
