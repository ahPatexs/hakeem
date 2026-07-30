import { isMaintenanceMode } from "@/lib/admin/maintenance";
import { getTranslations } from "next-intl/server";

export async function MaintenanceGate({ children }: { children: React.ReactNode }) {
  if (!(await isMaintenanceMode())) return children;
  const t = await getTranslations("admin.maintenance");
  return (
    <div className="mx-auto max-w-xl px-6 py-28 text-center">
      <h1 className="font-headline text-2xl text-primary">{t("title")}</h1>
      <p className="mt-3 text-on-surface-variant">{t("body")}</p>
    </div>
  );
}
