"use client";

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
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-medium text-primary">
        {label}
        {required ? <span className="text-error"> *</span> : null}
      </label>
      <Input
        id={id}
        name={name}
        type={type}
        required={required}
        autoComplete={autoComplete}
        defaultValue={defaultValue}
        disabled={disabled}
        placeholder={placeholder}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn(error && "border-error/50 focus:ring-error/20")}
      />
      {hint ? (
        <p id={hintId} className="text-xs text-on-surface-variant">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="text-xs text-error">
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