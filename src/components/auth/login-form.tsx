"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Link, useRouter } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { AuthAlert } from "@/components/auth/auth-alert";
import { AuthField } from "@/components/auth/auth-field";
import { loginAction } from "@/actions/auth/login";

export function LoginForm() {
  const t = useTranslations("auth");
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const errorId = "login-form-error";

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
    <form onSubmit={onSubmit} className="space-y-4" aria-describedby={error ? errorId : undefined} noValidate>
      {error ? (
        <AuthAlert variant="error" id={errorId}>
          {error}
        </AuthAlert>
      ) : null}
      <AuthField
        id="email"
        name="email"
        label={t("email")}
        type="email"
        required
        autoComplete="email"
      />
      <AuthField
        id="password"
        name="password"
        label={t("password")}
        type="password"
        required
        autoComplete="current-password"
      />
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
    </form>
  );
}
