"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { AuthAlert } from "@/components/auth/auth-alert";
import { AuthField, mapServerFieldErrors } from "@/components/auth/auth-field";
import { registerPatient } from "@/actions/auth/register";

export function RegisterForm() {
  const t = useTranslations("auth");
  const locale = useLocale() as "en" | "ar";
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const password = String(fd.get("password") ?? "");
    const confirmPassword = String(fd.get("confirmPassword") ?? "");
    const acceptTerms = fd.get("acceptTerms") === "on";

    const nextErrors: Record<string, string> = {};
    if (password !== confirmPassword) {
      nextErrors.confirmPassword = t("passwordsDoNotMatch");
    }
    if (!acceptTerms) {
      nextErrors.acceptTerms = t("termsRequired");
    }
    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      return;
    }

    setFieldErrors({});
    startTransition(async () => {
      const result = await registerPatient({
        name: String(fd.get("name") ?? ""),
        email: String(fd.get("email") ?? ""),
        password,
        acceptTerms: true,
        locale,
      });
      if (!result.ok) {
        if (result.fieldErrors) {
          setFieldErrors(mapServerFieldErrors(result.fieldErrors, t("errors.VALIDATION_ERROR")));
        } else if (result.code === "PASSWORD_POLICY") {
          setFieldErrors({ password: t("errors.PASSWORD_POLICY") });
        } else if (result.code === "TERMS_REQUIRED") {
          setFieldErrors({ acceptTerms: t("termsRequired") });
        }
        setError(t(`errors.${result.code}` as "errors.VALIDATION_ERROR"));
        return;
      }
      router.push(`/verify-email?email=${encodeURIComponent(String(fd.get("email") ?? ""))}`);
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {error ? <AuthAlert variant="error">{error}</AuthAlert> : null}
      <AuthField
        id="name"
        name="name"
        label={t("name")}
        required
        autoComplete="name"
        error={fieldErrors.name}
      />
      <AuthField
        id="email"
        name="email"
        label={t("email")}
        type="email"
        required
        autoComplete="email"
        error={fieldErrors.email}
      />
      <AuthField
        id="password"
        name="password"
        label={t("password")}
        type="password"
        required
        autoComplete="new-password"
        hint={t("passwordHint")}
        error={fieldErrors.password}
      />
      <AuthField
        id="confirmPassword"
        name="confirmPassword"
        label={t("confirmPassword")}
        type="password"
        required
        autoComplete="new-password"
        error={fieldErrors.confirmPassword}
      />
      <div className="space-y-2">
        <label className="flex items-start gap-2 text-sm text-on-surface-variant">
          <input
            type="checkbox"
            name="acceptTerms"
            className="mt-1 rounded border-outline-variant"
            aria-invalid={fieldErrors.acceptTerms ? true : undefined}
            aria-describedby={fieldErrors.acceptTerms ? "acceptTerms-error" : undefined}
          />
          <span>
            {t.rich("acceptTerms", {
              terms: (chunks) => (
                <Link href="/terms" className="font-medium text-primary hover:underline">
                  {chunks}
                </Link>
              ),
              privacy: (chunks) => (
                <Link href="/privacy-policy" className="font-medium text-primary hover:underline">
                  {chunks}
                </Link>
              ),
            })}
          </span>
        </label>
        {fieldErrors.acceptTerms ? (
          <p id="acceptTerms-error" role="alert" className="text-xs text-error">
            {fieldErrors.acceptTerms}
          </p>
        ) : null}
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
