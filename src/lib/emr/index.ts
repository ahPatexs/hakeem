export { emrAudit, type EmrAuditInput } from "./audit";
export {
  upsertTimelineEvent,
  listTimeline,
  backfillTimelineForPatient,
  type UpsertTimelineEventInput,
  type TimelineListFilters,
  type TimelineListItem,
} from "./timeline";
export { getSummary, buildCriticalFlags, type EmrSummaryDto, type EmrCriticalFlag } from "./summary";
export {
  listAllergies,
  upsertAllergy,
  softDeleteAllergy,
  listConditions,
  upsertCondition,
  softDeleteCondition,
  listImmunizations,
  upsertImmunization,
  softDeleteImmunization,
  listFamilyHistory,
  upsertFamilyHistory,
  softDeleteFamilyHistory,
  getLifestyle,
  updateLifestyle,
  getEmergencyInfo,
  updateEmergencyInfo,
  writeActionForSource,
} from "./history";
export { listDiagnoses, upsertDiagnosis } from "./diagnoses";
export {
  listEncounters,
  getEncounter,
  type EncounterListItem,
  type EncounterDetail,
} from "./encounters";
export {
  getSoapNote,
  saveSoapDraft,
  signSoapNote,
  amendSoapNote,
  listDoctorNotes,
  saveSummaryDraft,
  finalizeClinicalSummary,
  dismissClinicalSummary,
  dismissSoapNote,
  saveDoctorNote,
  signDoctorNote,
} from "./notes";
export { listPlans, upsertPlan, publishPlan } from "./plans";
export {
  listPrescriptions,
  savePrescriptionDraft,
  signPrescription,
  renewPrescription,
  denyPatientPrescriptionMutation,
  getPrescription,
  listPrescriptionsForDoctor,
  getPrescriptionForDoctor,
  listPrescriptionVersions,
  type PrescriptionBucket,
  type PrescriptionVersionChainItem,
} from "./prescriptions";
export {
  listLabResults,
  releaseLabToPatient,
  retractLab,
  getLabResult,
  listImagingResults,
  listLabInboxForDoctor,
  acknowledgeAndReleaseLab,
} from "./diagnostics";
export {
  listDocuments,
  softDeleteDocument,
  restoreDocument,
  getDocumentDownloadUrl,
  registerDocument,
  assertEmrDocumentMutableForReplace,
} from "./documents";
export { getMedicalRecord, listMedicalRecords } from "./records";
export {
  listConsentState,
  acknowledgeConsent,
  withdrawConsent,
  requireConsent,
  type ConsentStateItem,
} from "./consents";
export { getOversightSummary, setLegalHold, type OversightSummary } from "./admin";
export {
  inChartSearch,
  textContains,
  searchPatientsForAdmin,
  EMR_SEARCH_PAGE_SIZE,
  type InChartSearchFilters,
  type InChartSearchParams,
  type AdminPatientSearchItem,
  type AdminPatientSearchResult,
} from "./search";
export { buildAiChartContext, type AiChartContext } from "./ai-context";
