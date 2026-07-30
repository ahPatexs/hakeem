"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthAlert } from "@/components/auth/auth-alert";
import {
  approveDoctor,
  createDoctorUser,
  rejectDoctor,
  setUserStatus,
  inviteAdmin,
  assignRole,
  unlockUser,
} from "@/actions/auth/admin";

type DoctorRow = {
  id: string;
  email: string;
  name: string | null;
  status: string;
  doctorApproval: string | null;
};

type UserRow = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  status: string;
  doctorApproval: string | null;
  lockedUntil: string | Date | null;
};

export function AdminDoctorsPanel({
  doctors,
  users,
}: {
  doctors: DoctorRow[];
  users: UserRow[];
}) {
  const t = useTranslations("auth");
  const locale = useLocale() as "en" | "ar";
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<{ ok: boolean; code?: string; message?: string }>) {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setError(t(`errors.${result.code}` as "errors.FORBIDDEN"));
        return;
      }
      setMessage(result.message ?? t("saved"));
      window.location.reload();
    });
  }

  return (
    <div className="space-y-8">
      {message ? <AuthAlert variant="success">{message}</AuthAlert> : null}
      {error ? <AuthAlert variant="error">{error}</AuthAlert> : null}

      <section className="glass-card space-y-4 rounded-2xl p-6">
        <h2 className="font-headline text-xl text-primary">{t("createDoctor")}</h2>
        <form
          className="grid gap-3 md:grid-cols-3"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            run(() =>
              createDoctorUser({
                name: String(fd.get("name") ?? ""),
                email: String(fd.get("email") ?? ""),
              }),
            );
          }}
        >
          <Input name="name" placeholder={t("name")} required />
          <Input name="email" type="email" placeholder={t("email")} required />
          <Button type="submit" disabled={pending}>
            {t("createDoctor")}
          </Button>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="font-headline text-xl text-primary">{t("doctorsList")}</h2>
        <ul className="space-y-3">
          {doctors.map((d) => (
            <li
              key={d.id}
              className="flex flex-col gap-3 rounded-xl border border-outline-variant/30 bg-white p-4 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <p className="font-semibold text-primary">{d.name}</p>
                <p className="text-sm text-on-surface-variant">
                  {d.email} · {d.doctorApproval} · {d.status}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  disabled={pending}
                  onClick={() => run(() => approveDoctor({ userId: d.id, locale }))}
                >
                  {t("approve")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={() =>
                    run(() => rejectDoctor({ userId: d.id, reason: "Does not meet criteria" }))
                  }
                >
                  {t("reject")}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="font-headline text-xl text-primary">{t("usersList")}</h2>
        <ul className="space-y-3">
          {users.map((u) => {
            const locked =
              u.lockedUntil != null && new Date(u.lockedUntil).getTime() > Date.now();
            return (
              <li
                key={u.id}
                className="flex flex-col gap-3 rounded-xl border border-outline-variant/30 bg-white p-4 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <p className="font-semibold text-primary">
                    {u.name} · {u.role}
                    {locked ? ` · ${t("locked")}` : ""}
                  </p>
                  <p className="text-sm text-on-surface-variant">
                    {u.email} · {u.status}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    className="h-9 rounded-md border border-outline-variant bg-white px-2 text-sm"
                    defaultValue={u.role}
                    aria-label={t("assignRole")}
                    disabled={pending}
                    onChange={(e) => {
                      const role = e.target.value as "PATIENT" | "DOCTOR" | "ADMIN";
                      if (role === u.role) return;
                      run(() => assignRole({ userId: u.id, role }));
                    }}
                  >
                    <option value="PATIENT">PATIENT</option>
                    <option value="DOCTOR">DOCTOR</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={pending}
                    onClick={() => run(() => setUserStatus({ userId: u.id, status: "ACTIVE" }))}
                  >
                    {t("activate")}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={pending}
                    onClick={() => run(() => setUserStatus({ userId: u.id, status: "SUSPENDED" }))}
                  >
                    {t("suspend")}
                  </Button>
                  {locked ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={pending}
                      onClick={() => run(() => unlockUser({ userId: u.id }))}
                    >
                      {t("unlock")}
                    </Button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="glass-card space-y-4 rounded-2xl p-6">
        <h2 className="font-headline text-xl text-primary">{t("inviteAdmin")}</h2>
        <form
          className="grid gap-3 md:grid-cols-3"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            run(() =>
              inviteAdmin({
                name: String(fd.get("name") ?? ""),
                email: String(fd.get("email") ?? ""),
                locale,
              }),
            );
          }}
        >
          <Input name="name" placeholder={t("name")} required />
          <Input name="email" type="email" placeholder={t("email")} required />
          <Button type="submit" disabled={pending}>
            {t("inviteAdmin")}
          </Button>
        </form>
      </section>
    </div>
  );
}
