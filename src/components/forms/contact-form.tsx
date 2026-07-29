"use client";

import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

const schema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().optional(),
  topic: z.string().min(1),
  message: z.string().min(10).max(5000),
  website: z.string().max(0).optional(),
});

type FormValues = z.infer<typeof schema>;

export function ContactForm() {
  const t = useTranslations("forms");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { topic: "general", website: "" },
  });

  const onSubmit = handleSubmit(async () => {
    // Wired to /api/contact in US7.
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <input type="text" tabIndex={-1} autoComplete="off" className="hidden" {...register("website")} />
      <div>
        <label className="mb-1 block text-sm font-medium text-primary" htmlFor="name">
          {t("name")}
        </label>
        <Input id="name" aria-invalid={!!errors.name} {...register("name")} />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-primary" htmlFor="email">
          {t("email")}
        </label>
        <Input id="email" type="email" aria-invalid={!!errors.email} {...register("email")} />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-primary" htmlFor="phone">
          {t("phone")}
        </label>
        <Input id="phone" {...register("phone")} />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-primary" htmlFor="topic">
          {t("topic")}
        </label>
        <select
          id="topic"
          className="flex h-11 w-full rounded-lg border border-outline-variant/30 bg-white px-4 text-sm"
          {...register("topic")}
        >
          <option value="general">General</option>
          <option value="appointments">Appointments</option>
          <option value="doctors">Doctors</option>
          <option value="technical">Technical</option>
          <option value="partnership">Partnership</option>
        </select>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-primary" htmlFor="message">
          {t("message")}
        </label>
        <Textarea id="message" aria-invalid={!!errors.message} {...register("message")} />
      </div>
      <Button type="submit" disabled={isSubmitting} className="w-full">
        {t("send")}
      </Button>
    </form>
  );
}
