import { AdminMobileNav, AdminSidebar } from "@/components/admin/shell/admin-sidebar";
import { AdminHeaderActions } from "@/components/admin/shell/admin-header";
import { portalShellBgClass } from "@/components/portal/chrome";
import { cn } from "@/lib/utils";

export function AdminPortalShell({
  children,
  header,
  unreadCount,
  displayName,
  email,
  className,
}: {
  children: React.ReactNode;
  header?: React.ReactNode;
  unreadCount: number;
  displayName: string;
  email: string;
  className?: string;
}) {
  return (
    <div className={cn("flex", portalShellBgClass, className)}>
      <AdminSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="portal-header flex items-center gap-3 px-4 py-3 lg:px-8">
          <AdminMobileNav />
          <div className="min-w-0 flex-1">{header}</div>
          <AdminHeaderActions unreadCount={unreadCount} displayName={displayName} email={email} />
        </header>
        <div className="flex-1 px-4 py-6 lg:px-8 lg:py-8">{children}</div>
      </div>
    </div>
  );
}