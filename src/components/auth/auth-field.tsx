"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type AuthFieldProps = {
  id: string;
  name: string;
  label: string;
  type?: React.ComponentProps<"input">["type"];
  error?: string;
  hint?: string;
  required?: boolean;
  autoComplete?: string;
  defaultValue?: string;
  disabled?: boolean;
  placeholder?: string;
};

export function AuthField({
  id,
  name,
  label,
  type = "text",
  error,
  hint,
  required,
  autoComplete,
  defaultValue,
  disabled,
  placeholder,
}: AuthFieldProps) {
  const t = useTranslations("auth");
  const [visible, setVisible] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword && visible ? "text" : type;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="auth-label text-sm font-medium text-primary">
        {label}
        {required ? <span className="text-error"> *</span> : null}
      </label>
      <div className="relative">
        <Input
          id={id}
          name={name}
          type={inputType}
          required={required}
          autoComplete={autoComplete}
          defaultValue={defaultValue}
          disabled={disabled}
          placeholder={placeholder}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn("auth-input", isPassword && "pe-11", error && "border-error/50 focus:ring-error/20")}
        />
        {isPassword ? (
          <button
            type="button"
            className="auth-toggle absolute end-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? t("hidePassword") : t("showPassword")}
          >
            {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        ) : null}
      </div>
      {hint ? (
        <p id={hintId} className="auth-hint text-xs text-on-surface-variant">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="auth-error text-xs text-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function mapServerFieldErrors(
  fieldErrors: Record<string, string[]>,
  fallback: string,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, msgs] of Object.entries(fieldErrors)) {
    out[key] = msgs[0] ?? fallback;
  }
  return out;
}