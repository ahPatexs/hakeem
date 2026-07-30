import { DoctorMobileNav, DoctorSidebar } from "@/components/doctor/shell/doctor-sidebar";
import { DoctorHeaderActions } from "@/components/doctor/shell/doctor-header";
import { OfflineProvider } from "@/components/doctor/workspace/offline-guard";
import { cn } from "@/lib/utils";

export function DoctorShell({
  children,
  header,
  unreadCount,
  displayName,
  specialty,
  className,
}: {
  children: React.ReactNode;
  header?: React.ReactNode;
  unreadCount: number;
  displayName: string;
  specialty?: string | null;
  className?: string;
}) {
  return (
    <OfflineProvider>
      <div className={cn("flex min-h-[calc(100vh-0px)] bg-surface-container", className)}>
        <DoctorSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-outline-variant/20 bg-surface-container-low/95 px-4 py-3 backdrop-blur-sm lg:px-8">
            <DoctorMobileNav />
            <div className="min-w-0 flex-1">{header}</div>
            <DoctorHeaderActions
              unreadCount={unreadCount}
              displayName={displayName}
              specialty={specialty}
            />
          </header>
          <div className="flex-1 px-4 py-6 lg:px-8">{children}</div>
        </div>
      </div>
    </OfflineProvider>
  );
}
