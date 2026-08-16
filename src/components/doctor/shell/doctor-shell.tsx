import { DoctorMobileNav, DoctorSidebar } from "@/components/doctor/shell/doctor-sidebar";
import { DoctorHeaderActions } from "@/components/doctor/shell/doctor-header";
import { OfflineProvider } from "@/components/doctor/workspace/offline-guard";
import { portalShellBgClass } from "@/components/portal/chrome";
import { cn } from "@/lib/utils";

export function DoctorShell({
  children,
  header,
  unreadCount,
  displayName,
  specialty,
  photoUrl,
  className,
}: {
  children: React.ReactNode;
  header?: React.ReactNode;
  unreadCount: number;
  displayName: string;
  specialty?: string | null;
  photoUrl?: string | null;
  className?: string;
}) {
  return (
    <OfflineProvider>
      <div className={cn("flex", portalShellBgClass, className)}>
        <DoctorSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="portal-header flex items-center gap-3 px-4 py-3 lg:px-8">
            <DoctorMobileNav />
            <div className="min-w-0 flex-1">{header}</div>
            <DoctorHeaderActions
              unreadCount={unreadCount}
              displayName={displayName}
              specialty={specialty}
              photoUrl={photoUrl}
            />
          </header>
          <div className="flex-1 px-4 py-6 lg:px-8 lg:py-8">{children}</div>
        </div>
      </div>
    </OfflineProvider>
  );
}