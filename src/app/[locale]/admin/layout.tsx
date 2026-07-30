import { setRequestLocale } from "next-intl/server";
import { RoleLayoutGate } from "@/auth/role-layout";

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <RoleLayoutGate role="ADMIN" locale={locale}>
      {children}
    </RoleLayoutGate>
  );
}
