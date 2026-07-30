import { setRequestLocale, getTranslations } from "next-intl/server";
import { listRolesMatrix, listAdminUsers } from "@/actions/admin/roles";
import { DataTable } from "@/components/admin/shared/data-table";
import { RolesAdminForms } from "@/components/admin/roles/roles-admin-forms";

export default async function AdminRolesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin.roles");
  const [matrix, admins] = await Promise.all([listRolesMatrix(), listAdminUsers()]);
  if (!matrix.ok || !admins.ok) return <p className="text-warm-coral">FORBIDDEN</p>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-headline text-3xl text-primary">{t("title")}</h1>
        <p className="text-on-surface-variant">{t("subtitle")}</p>
      </div>
      <RolesAdminForms />
      <section>
        <h2 className="mb-3 font-headline text-lg text-primary">{t("admins")}</h2>
        <DataTable
          columns={[t("email"), t("name"), t("status")]}
          rows={admins.data.map((a) => [a.email, a.name ?? "—", a.status])}
        />
      </section>
      <section>
        <h2 className="mb-3 font-headline text-lg text-primary">{t("matrix")}</h2>
        <p className="mb-4 text-sm text-on-surface-variant">
          {t("adminPermissionCount", { count: matrix.data.matrix.ADMIN.length })}
        </p>
        <ul className="grid gap-2 text-sm sm:grid-cols-2">
          {matrix.data.matrix.ADMIN.map((p) => (
            <li key={p} className="rounded-lg bg-surface-container-high px-3 py-2 text-primary">
              {p}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
