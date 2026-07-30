import { setRequestLocale } from "next-intl/server";
import { getDashboardSnapshot } from "@/actions/admin/dashboard";
import { DashboardGrid } from "@/components/admin/dashboard/dashboard-grid";
import { ErrorState } from "@/components/platform";

export default async function AdminDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const result = await getDashboardSnapshot();
  if (!result.ok) {
    return <ErrorState title="Dashboard unavailable" message={result.code} />;
  }
  return <DashboardGrid snapshot={result.data} />;
}
