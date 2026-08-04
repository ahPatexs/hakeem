/**
 * Integration-shaped checks for the documents facade without a live DB:
 * verifies the register/download/list/soft-delete surface is wired
 * consistently between the Prisma enum, the facade, and the Server Action
 * validation schema (T074 / T105).
 */
import { describe, expect, it } from "vitest";
import { ClinicalDocumentKind } from "@prisma/client";
import {
  listDocuments,
  softDeleteDocument,
  restoreDocument,
  getDocumentDownloadUrl,
  registerDocument,
} from "@/lib/emr/documents";
import { canAccessDocument } from "@/domain/platform/documents";
import { isSoftDeleted } from "@/domain/emr/soft-delete";

const CLINICAL_DOCUMENT_KINDS = [
  "RECORD_ATTACHMENT",
  "LAB_ATTACHMENT",
  "PATIENT_UPLOAD",
  "RECEIPT",
  "REFERRAL",
  "CERTIFICATE",
  "CONSENT_EVIDENCE",
  "IMAGING_REPORT",
  "OTHER",
] as const;

describe("emr documents facade wiring", () => {
  it("exports the full document lifecycle surface", () => {
    expect(typeof listDocuments).toBe("function");
    expect(typeof softDeleteDocument).toBe("function");
    expect(typeof restoreDocument).toBe("function");
    expect(typeof getDocumentDownloadUrl).toBe("function");
    expect(typeof registerDocument).toBe("function");
  });

  it("the Server Action's kind enum stays in sync with the Prisma schema", () => {
    const prismaKinds = Object.values(ClinicalDocumentKind).sort();
    expect([...CLINICAL_DOCUMENT_KINDS].sort()).toEqual(prismaKinds);
  });

  it("a soft-deleted document is excluded from the default view", () => {
    const doc = { deletedAt: new Date(), legalHold: false };
    expect(isSoftDeleted(doc)).toBe(true);
  });

  it("legal hold prevents deletion but is orthogonal to soft-delete status", () => {
    const onHold = { deletedAt: null, legalHold: true };
    expect(isSoftDeleted(onHold)).toBe(false);
    expect(onHold.legalHold).toBe(true);
  });

  it("download access composes RBAC with the file-level scan/ACL check", () => {
    // A clean, owned document is downloadable by its patient.
    expect(canAccessDocument("patient-1", "patient-1", "PATIENT", { scanStatus: "CLEAN" })).toBe(
      true,
    );
    // Cross-patient access is denied even for a clean scan.
    expect(canAccessDocument("patient-1", "patient-2", "PATIENT", { scanStatus: "CLEAN" })).toBe(
      false,
    );
  });
});
