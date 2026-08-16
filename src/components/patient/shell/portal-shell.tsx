import { PortalMobileNav, PortalSidebar } from "@/components/patient/shell/portal-sidebar";
import { PatientHeaderActions } from "@/components/patient/shell/patient-header";
import { portalShellBgClass } from "@/components/portal/chrome";
import { cn } from "@/lib/utils";

export function PortalShell({
  children,
  header,
  unreadCount = 0,
  displayName,
  photoUrl,
  className,
}: {
  children: React.ReactNode;
  header?: React.ReactNode;
  unreadCount?: number;
  displayName?: string;
  photoUrl?: string | null;
  className?: string;
}) {
  return (
    <div className={cn("flex", portalShellBgClass, className)}>
      <PortalSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="portal-header flex items-center gap-3 px-4 py-3 lg:px-8">
          <PortalMobileNav />
          <div className="min-w-0 flex-1">{header}</div>
          {displayName ? (
            <PatientHeaderActions unreadCount={unreadCount} displayName={displayName} photoUrl={photoUrl} />
          ) : null}
        </header>
        <div className="flex-1 px-4 py-6 lg:px-8 lg:py-8">{children}</div>
      </div>
    </div>
  );
}
