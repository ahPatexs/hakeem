"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/routing";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AuthAlert } from "@/components/auth/auth-alert";
import { registerPatient } from "@/actions/auth/register";

export function RegisterForm() {
  const t = useTranslations("auth");
  const locale = useLocale() as "en" | "ar";
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await registerPatient({
        name: String(fd.get("name") ?? ""),
        email: String(fd.get("email") ?? ""),
        password: String(fd.get("password") ?? ""),
        locale,
      });
      if (!result.ok) {
        setError(t(`errors.${result.code}` as "errors.VALIDATION_ERROR"));
        return;
      }
      router.push(`/verify-email?email=${encodeURIComponent(String(fd.get("email") ?? ""))}`);
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error ? <AuthAlert variant="error">{error}</AuthAlert> : null}
      <div className="space-y-2">
        <label htmlFor="name" className="text-sm font-medium text-primary">
          {t("name")}
        </label>
        <Input id="name" name="name" required autoComplete="name" />
      </div>
      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-medium text-primary">
          {t("email")}
        </label>
        <Input id="email" name="email" type="email" required autoComplete="email" />
      </div>
      <div className="space-y-2">
        <label htmlFor="password" className="text-sm font-medium text-primary">
          {t("password")}
        </label>
        <Input id="password" name="password" type="password" required autoComplete="new-password" />
        <p className="text-xs text-on-surface-variant">{t("passwordHint")}</p>
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? t("loading") : t("createAccount")}
      </Button>
      <p className="text-center text-sm text-on-surface-variant">
        {t("hasAccount")}{" "}
        <Link href="/login" className="font-semibold text-med-green hover:underline">
          {t("signIn")}
        </Link>
      </p>
    </form>
  );
}
