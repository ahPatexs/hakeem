"use client";

import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Send } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const schema = z.object({
  email: z.string().email(),
});

type FormValues = z.infer<typeof schema>;

export function NewsletterForm() {
  const t = useTranslations("footer");
  const tForms = useTranslations("forms");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitSuccessful },
    reset,
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = handleSubmit(async () => {
    // Wired to /api/newsletter in US7; Module 0 provides UI + client validation.
    reset();
  });

  return (
    <form onSubmit={onSubmit} className="flex gap-2" noValidate>
      <Input
        type="email"
        placeholder={t("emailPlaceholder")}
        aria-invalid={!!errors.email}
        aria-label={tForms("email")}
        {...register("email")}
      />
      <Button type="submit" size="icon" aria-label={t("subscribe")}>
        <Send className="h-4 w-4" />
      </Button>
      {errors.email ? (
        <span className="sr-only">{tForms("invalidEmail")}</span>
      ) : null}
      {isSubmitSuccessful ? <span className="sr-only">Subscribed</span> : null}
    </form>
  );
}
