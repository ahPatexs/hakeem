import { setRequestLocale } from "next-intl/server";
import { PortalShell } from "@/components/patient/shell/portal-shell";
import { QueryProvider } from "@/components/providers/query-provider";
import { RoleLayoutGate } from "@/auth/role-layout";

export default async function PatientLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <RoleLayoutGate role="PATIENT" locale={locale}>
      <QueryProvider>
        <PortalShell>{children}</PortalShell>
      </QueryProvider>
    </RoleLayoutGate>
  );
}
