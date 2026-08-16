import { Link } from "@/i18n/routing";
import { segmentedOptionClass, segmentedTrackClass } from "@/components/portal/chrome";

const TABS = ["overview", "visits", "treatment", "notes", "records"] as const;
export type PatientFileTab = (typeof TABS)[number];

export function parsePatientFileTab(raw?: string): PatientFileTab {
  return TABS.includes(raw as PatientFileTab) ? (raw as PatientFileTab) : "overview";
}

export function PatientFileTabs({
  patientId,
  active,
  labels,
}: {
  patientId: string;
  active: PatientFileTab;
  labels: Record<PatientFileTab, string>;
}) {
  return (
    <nav className={`${segmentedTrackClass} flex-wrap`} aria-label={labels.overview}>
      {TABS.map((tab) => {
        const href = tab === "overview" ? `/doctor/patients/${patientId}` : `/doctor/patients/${patientId}?tab=${tab}`;
        return (
          <Link
            key={tab}
            href={href}
            className={segmentedOptionClass(active === tab)}
            aria-current={active === tab ? "page" : undefined}
          >
            {labels[tab]}
          </Link>
        );
      })}
    </nav>
  );
}
