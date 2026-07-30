import { setRequestLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { getUser } from "@/actions/admin/users";
import { StatusBadge } from "@/components/admin/shared/status-badge";
import { UserDetailActions } from "@/components/admin/users/user-detail-actions";

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ locale: string; userId: string }>;
}) {
  const { locale, userId } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin.users");
  const result = await getUser(userId);
  if (!result.ok || !result.data) notFound();
  const user = result.data;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-headline text-2xl text-primary">{user.name ?? user.email}</h1>
        <p className="text-on-surface-variant">{user.email}</p>
      </div>
      <dl className="grid gap-3 text-sm">
        <div className="flex justify-between">
          <dt className="text-on-surface-variant">{t("role")}</dt>
          <dd>{user.role}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-on-surface-variant">{t("status")}</dt>
          <dd>
            <StatusBadge label={user.status} variant={user.status === "ACTIVE" ? "success" : "warning"} />
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-on-surface-variant">{t("failedLogins")}</dt>
          <dd>{user.failedLoginCount}</dd>
        </div>
      </dl>
      <UserDetailActions userId={user.id} status={user.status} />
    </div>
  );
}
