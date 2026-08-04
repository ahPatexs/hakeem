/**
 * Small ICD-10(-CM) catalog for diagnosis combobox search (T141 / FR-046).
 * Free-text fallback remains available when no catalog match is selected.
 */
export type Icd10CatalogEntry = {
  code: string;
  display: string;
};

export const ICD10_CATALOG: Icd10CatalogEntry[] = [
  { code: "E11.9", display: "Type 2 diabetes mellitus without complications" },
  { code: "I10", display: "Essential (primary) hypertension" },
  { code: "J06.9", display: "Acute upper respiratory infection, unspecified" },
  { code: "J18.9", display: "Pneumonia, unspecified organism" },
  { code: "J45.909", display: "Unspecified asthma, uncomplicated" },
  { code: "K21.0", display: "Gastro-esophageal reflux disease with esophagitis" },
  { code: "M54.5", display: "Low back pain" },
  { code: "N39.0", display: "Urinary tract infection, site not specified" },
  { code: "R50.9", display: "Fever, unspecified" },
  { code: "R51.9", display: "Headache, unspecified" },
  { code: "Z00.00", display: "Encounter for general adult medical examination without abnormal findings" },
  { code: "Z23", display: "Encounter for immunization" },
];

export function searchIcd10Catalog(query: string, limit = 8): Icd10CatalogEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return ICD10_CATALOG.slice(0, limit);
  return ICD10_CATALOG.filter(
    (e) => e.code.toLowerCase().includes(q) || e.display.toLowerCase().includes(q),
  ).slice(0, limit);
}
