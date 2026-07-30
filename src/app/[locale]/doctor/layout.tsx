import { setRequestLocale } from "next-intl/server";
import { RoleLayoutGate } from "@/auth/role-layout";

export default async function DoctorLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <RoleLayoutGate role="DOCTOR" locale={locale}>
      {children}
    </RoleLayoutGate>
  );
}
