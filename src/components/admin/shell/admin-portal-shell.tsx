import { AdminMobileNav, AdminSidebar } from "@/components/admin/shell/admin-sidebar";
import { AdminHeaderActions } from "@/components/admin/shell/admin-header";
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
    <div className={cn("flex min-h-[calc(100vh-0px)] bg-surface-container", className)}>
      <AdminSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-outline-variant/20 bg-surface-container-low/95 px-4 py-3 backdrop-blur-sm lg:px-8">
          <AdminMobileNav />
          <div className="min-w-0 flex-1">{header}</div>
          <AdminHeaderActions unreadCount={unreadCount} displayName={displayName} email={email} />
        </header>
        <div className="flex-1 px-4 py-6 lg:px-8">{children}</div>
      </div>
    </div>
  );
}
