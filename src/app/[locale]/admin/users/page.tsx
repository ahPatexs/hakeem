import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { listUsers } from "@/actions/admin/users";
import { DataTable } from "@/components/admin/shared/data-table";
import { Pagination } from "@/components/admin/shared/pagination";
import { StatusBadge } from "@/components/admin/shared/status-badge";
import { EmptyState } from "@/components/platform";
import { Input } from "@/components/ui/input";

const ROLES = ["PATIENT", "DOCTOR", "ADMIN"] as const;
const STATUSES = ["PENDING_VERIFICATION", "ACTIVE", "SUSPENDED", "DEACTIVATED"] as const;

export default async function AdminUsersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; role?: string; status?: string; page?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("admin.users");
  const page = Number(sp.page ?? 1);
  const result = await listUsers({
    q: sp.q,
    role: sp.role as (typeof ROLES)[number] | undefined,
    status: sp.status as (typeof STATUSES)[number] | undefined,
    page,
  });
  if (!result.ok) {
    return <p className="text-warm-coral">{result.code}</p>;
  }
  const { items, total, pageSize } = result.data;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const filterParams = { q: sp.q, role: sp.role, status: sp.status };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-headline text-3xl text-primary">{t("title")}</h1>
        <p className="text-on-surface-variant">{t("subtitle")}</p>
      </div>
      <form method="get" className="flex flex-wrap items-end gap-2">
        <Input
          name="q"
          defaultValue={sp.q}
          placeholder={t("searchPlaceholder")}
          className="max-w-xs"
        />
        <select
          name="role"
          defaultValue={sp.role ?? ""}
          className="h-10 rounded-lg border border-outline-variant/30 bg-surface-container-low px-3 text-sm"
          aria-label={t("roleFilter")}
        >
          <option value="">{t("allRoles")}</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <select
          name="status"
          defaultValue={sp.status ?? ""}
          className="h-10 rounded-lg border border-outline-variant/30 bg-surface-container-low px-3 text-sm"
          aria-label={t("statusFilter")}
        >
          <option value="">{t("allStatuses")}</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-on-primary"
        >
          {t("applyFilters")}
        </button>
      </form>
      {items.length === 0 ? (
        <EmptyState title={t("empty")} />
      ) : (
        <>
          <DataTable
            columns={[t("email"), t("name"), t("role"), t("status"), ""]}
            rows={items.map((u) => [
              u.email,
              u.name ?? "—",
              u.role,
              <StatusBadge key={u.id} label={u.status} variant={u.status === "ACTIVE" ? "success" : "warning"} />,
              <Link key={`link-${u.id}`} href={`/admin/users/${u.id}`} className="text-med-green hover:underline">
                {t("view")}
              </Link>,
            ])}
          />
          <Pagination page={page} totalPages={totalPages} basePath="/admin/users" searchParams={filterParams} />
        </>
      )}
    </div>
  );
}
