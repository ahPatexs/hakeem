export type HistoryAllergyItem = {
  id: string;
  substance: string;
  reaction?: string | null;
  severity?: string | null;
  source: string;
  criticalFlag?: boolean;
};

export type HistoryConditionItem = {
  id: string;
  display: string;
  icd10Code?: string | null;
  status: string;
  source: string;
};

export type HistoryLifestyle = {
  smoking?: string | null;
  alcohol?: string | null;
  activity?: string | null;
  notes?: string | null;
} | null;

export type HistoryImmunizationItem = {
  id: string;
  vaccineName: string;
  administeredOn?: Date | string | null;
  source: string;
};

export type HistoryFamilyItem = {
  id: string;
  relation: string;
  conditionDisplay: string;
  notes?: string | null;
};

export type HistoryEmergencyInfo = {
  contactName?: string | null;
  contactPhone?: string | null;
  criticalAlertsText?: string | null;
} | null;

export type HistorySectionsLabels = {
  title: string;
  allergies: string;
  conditions: string;
  lifestyle: string;
  empty: string;
  sourcePatient: string;
  sourceClinician: string;
  smoking?: string;
  alcohol?: string;
  activity?: string;
  notes?: string;
  immunizations?: string;
  family?: string;
  emergency?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyCriticalAlerts?: string;
};

function sourceLabel(source: string, labels: HistorySectionsLabels) {
  if (source === "CLINICIAN_ATTESTED") return labels.sourceClinician;
  return labels.sourcePatient;
}

export function HistorySections({
  allergies,
  conditions,
  lifestyle,
  immunizations = [],
  familyHistory = [],
  emergency = null,
  labels,
}: {
  allergies: HistoryAllergyItem[];
  conditions: HistoryConditionItem[];
  lifestyle: HistoryLifestyle;
  immunizations?: HistoryImmunizationItem[];
  familyHistory?: HistoryFamilyItem[];
  emergency?: HistoryEmergencyInfo;
  labels: HistorySectionsLabels;
}) {
  const hasAny =
    allergies.length > 0 ||
    conditions.length > 0 ||
    immunizations.length > 0 ||
    familyHistory.length > 0 ||
    Boolean(emergency?.contactName || emergency?.contactPhone || emergency?.criticalAlertsText) ||
    Boolean(lifestyle?.smoking || lifestyle?.alcohol || lifestyle?.activity || lifestyle?.notes);

  return (
    <section className="space-y-6 rounded-xl border border-outline-variant/20 bg-surface-container-low p-5">
      <h2 className="font-headline text-lg text-primary">{labels.title}</h2>

      {!hasAny ? <p className="text-sm text-on-surface-variant">{labels.empty}</p> : null}

      <div>
        <h3 className="text-xs font-medium uppercase tracking-wide text-on-surface-variant">
          {labels.allergies}
        </h3>
        {allergies.length === 0 ? (
          <p className="mt-2 text-sm text-on-surface-variant">—</p>
        ) : (
          <ul className="mt-2 divide-y divide-outline-variant/15">
            {allergies.map((a) => (
              <li key={a.id} className="flex items-start justify-between gap-3 py-2 first:pt-0 last:pb-0">
                <div>
                  <p className="text-sm font-medium text-primary">
                    {a.substance}
                    {a.criticalFlag ? (
                      <span className="ms-2 text-xs text-warm-coral" aria-label="critical">
                        !
                      </span>
                    ) : null}
                  </p>
                  {a.reaction ? (
                    <p className="text-xs text-on-surface-variant">{a.reaction}</p>
                  ) : null}
                </div>
                <span className="shrink-0 text-xs text-on-surface-variant">
                  {sourceLabel(a.source, labels)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h3 className="text-xs font-medium uppercase tracking-wide text-on-surface-variant">
          {labels.conditions}
        </h3>
        {conditions.length === 0 ? (
          <p className="mt-2 text-sm text-on-surface-variant">—</p>
        ) : (
          <ul className="mt-2 divide-y divide-outline-variant/15">
            {conditions.map((c) => (
              <li key={c.id} className="flex items-start justify-between gap-3 py-2 first:pt-0 last:pb-0">
                <div>
                  <p className="text-sm font-medium text-primary">{c.display}</p>
                  {c.icd10Code ? (
                    <p className="text-xs text-on-surface-variant">{c.icd10Code}</p>
                  ) : null}
                </div>
                <span className="shrink-0 text-xs text-on-surface-variant">
                  {sourceLabel(c.source, labels)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h3 className="text-xs font-medium uppercase tracking-wide text-on-surface-variant">
          {labels.lifestyle}
        </h3>
        {!lifestyle ||
        !(lifestyle.smoking || lifestyle.alcohol || lifestyle.activity || lifestyle.notes) ? (
          <p className="mt-2 text-sm text-on-surface-variant">—</p>
        ) : (
          <dl className="mt-2 space-y-2 text-sm">
            {lifestyle.smoking ? (
              <div>
                <dt className="text-xs text-on-surface-variant">{labels.smoking ?? "Smoking"}</dt>
                <dd className="text-primary">{lifestyle.smoking}</dd>
              </div>
            ) : null}
            {lifestyle.alcohol ? (
              <div>
                <dt className="text-xs text-on-surface-variant">{labels.alcohol ?? "Alcohol"}</dt>
                <dd className="text-primary">{lifestyle.alcohol}</dd>
              </div>
            ) : null}
            {lifestyle.activity ? (
              <div>
                <dt className="text-xs text-on-surface-variant">{labels.activity ?? "Activity"}</dt>
                <dd className="text-primary">{lifestyle.activity}</dd>
              </div>
            ) : null}
            {lifestyle.notes ? (
              <div>
                <dt className="text-xs text-on-surface-variant">{labels.notes ?? "Notes"}</dt>
                <dd className="text-primary">{lifestyle.notes}</dd>
              </div>
            ) : null}
          </dl>
        )}
      </div>

      {labels.immunizations ? (
        <div>
          <h3 className="text-xs font-medium uppercase tracking-wide text-on-surface-variant">
            {labels.immunizations}
          </h3>
          {immunizations.length === 0 ? (
            <p className="mt-2 text-sm text-on-surface-variant">—</p>
          ) : (
            <ul className="mt-2 divide-y divide-outline-variant/15">
              {immunizations.map((im) => (
                <li key={im.id} className="flex items-start justify-between gap-3 py-2 first:pt-0 last:pb-0">
                  <p className="text-sm font-medium text-primary">{im.vaccineName}</p>
                  <span className="shrink-0 text-xs text-on-surface-variant">
                    {sourceLabel(im.source, labels)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      {labels.family ? (
        <div>
          <h3 className="text-xs font-medium uppercase tracking-wide text-on-surface-variant">
            {labels.family}
          </h3>
          {familyHistory.length === 0 ? (
            <p className="mt-2 text-sm text-on-surface-variant">—</p>
          ) : (
            <ul className="mt-2 divide-y divide-outline-variant/15">
              {familyHistory.map((f) => (
                <li key={f.id} className="py-2 first:pt-0 last:pb-0">
                  <p className="text-sm font-medium text-primary">
                    {f.conditionDisplay}
                    <span className="ms-2 text-xs text-on-surface-variant">({f.relation})</span>
                  </p>
                  {f.notes ? <p className="text-xs text-on-surface-variant">{f.notes}</p> : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      {labels.emergency ? (
        <div>
          <h3 className="text-xs font-medium uppercase tracking-wide text-on-surface-variant">
            {labels.emergency}
          </h3>
          {!emergency || !(emergency.contactName || emergency.contactPhone || emergency.criticalAlertsText) ? (
            <p className="mt-2 text-sm text-on-surface-variant">—</p>
          ) : (
            <dl className="mt-2 space-y-2 text-sm">
              {emergency.contactName ? (
                <div>
                  <dt className="text-xs text-on-surface-variant">
                    {labels.emergencyContactName ?? "Contact"}
                  </dt>
                  <dd className="text-primary">{emergency.contactName}</dd>
                </div>
              ) : null}
              {emergency.contactPhone ? (
                <div>
                  <dt className="text-xs text-on-surface-variant">
                    {labels.emergencyContactPhone ?? "Phone"}
                  </dt>
                  <dd className="text-primary">{emergency.contactPhone}</dd>
                </div>
              ) : null}
              {emergency.criticalAlertsText ? (
                <div>
                  <dt className="text-xs text-on-surface-variant">
                    {labels.emergencyCriticalAlerts ?? "Critical alerts"}
                  </dt>
                  <dd className="text-warm-coral">{emergency.criticalAlertsText}</dd>
                </div>
              ) : null}
            </dl>
          )}
        </div>
      ) : null}
    </section>
  );
}
