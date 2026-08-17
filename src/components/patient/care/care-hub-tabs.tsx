import { Link } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import { segmentedOptionClass, segmentedTrackClass } from "@/components/portal/chrome";

export type CareHubTab = {
  key: string;
  label: string;
  href: string;
  count?: number;
};

export function CareHubTabs({
  tabs,
  activeKey,
  ariaLabel,
}: {
  tabs: CareHubTab[];
  activeKey: string;
  ariaLabel: string;
}) {
  return (
    <nav className={cn(segmentedTrackClass, "flex-wrap")} aria-label={ariaLabel}>
      {tabs.map((tab) => {
        const active = tab.key === activeKey;
        return (
          <Link
            key={tab.key}
            href={tab.href}
            className={segmentedOptionClass(active)}
            aria-current={active ? "page" : undefined}
          >
            {tab.label}
            {typeof tab.count === "number" ? (
              <span className="tabular-nums opacity-80">({tab.count})</span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
