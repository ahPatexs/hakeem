import { PortalMobileNav, PortalSidebar } from "@/components/patient/shell/portal-sidebar";
import { cn } from "@/lib/utils";

export function PortalShell({
  children,
  header,
  className,
}: {
  children: React.ReactNode;
  header?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex min-h-[calc(100vh-0px)] bg-surface-container", className)}>
      <PortalSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-outline-variant/20 bg-surface-container-low/95 px-4 py-3 backdrop-blur-sm lg:px-8">
          <PortalMobileNav />
          <div className="min-w-0 flex-1">{header}</div>
        </header>
        <div className="flex-1 px-4 py-6 lg:px-8">{children}</div>
      </div>
    </div>
  );
}
