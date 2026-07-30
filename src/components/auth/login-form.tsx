"use client";

import { useState, useTransition } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Link, useRouter } from "@/i18n/routing";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AuthAlert } from "@/components/auth/auth-alert";
import { loginAction } from "@/actions/auth/login";

export function LoginForm() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await loginAction({
        email: String(fd.get("email") ?? ""),
        password: String(fd.get("password") ?? ""),
        rememberMe: fd.get("rememberMe") === "on",
        next: params.get("next") ?? undefined,
      });
      if (!result.ok) {
        setError(t(`errors.${result.code}` as "errors.INVALID_CREDENTIALS"));
        return;
      }
      router.push(result.redirectTo as "/patient");
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error ? <AuthAlert variant="error">{error}</AuthAlert> : null}
      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-medium text-primary">
          {t("email")}
        </label>
        <Input id="email" name="email" type="email" autoComplete="email" required aria-required />
      </div>
      <div className="space-y-2">
        <label htmlFor="password" className="text-sm font-medium text-primary">
          {t("password")}
        </label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-on-surface-variant">
        <input type="checkbox" name="rememberMe" className="rounded border-outline-variant" />
        {t("rememberMe")}
      </label>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? t("loading") : t("signIn")}
      </Button>
      <div className="flex flex-col gap-2 text-center text-sm">
        <Link href="/forgot-password" className="text-primary hover:underline">
          {t("forgotPassword")}
        </Link>
        <p className="text-on-surface-variant">
          {t("noAccount")}{" "}
          <Link href="/register" className="font-semibold text-med-green hover:underline">
            {t("register")}
          </Link>
        </p>
      </div>
      <p className="sr-only">{locale}</p>
    </form>
  );
}
