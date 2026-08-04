/**
 * Full feature × role RBAC matrix including streaming route guard parity.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import path from "path";
import {
  canAccessAiFeature,
  type AiActorRole,
  type AiFeatureKey,
} from "@/domain/ai/access";

const FEATURES: AiFeatureKey[] = [
  "PATIENT_ASSISTANT",
  "SYMPTOM_CHECKER",
  "RECOMMENDATIONS",
  "DOCTOR_SOAP",
  "DOCTOR_SUMMARY",
  "RX_ASSIST",
  "CDS",
];

const ROLES: AiActorRole[] = ["PATIENT", "DOCTOR", "ADMIN"];

describe("AI feature × role RBAC matrix", () => {
  it("patients access patient features only", () => {
    for (const feature of FEATURES) {
      const allowed = canAccessAiFeature("PATIENT", feature);
      const expected = ["PATIENT_ASSISTANT", "SYMPTOM_CHECKER", "RECOMMENDATIONS"].includes(
        feature,
      );
      expect(allowed, feature).toBe(expected);
    }
  });

  it("doctors require care relationship for clinical features", () => {
    for (const feature of FEATURES) {
      expect(canAccessAiFeature("DOCTOR", feature, { hasCareRelationship: false })).toBe(false);
      const withCare = canAccessAiFeature("DOCTOR", feature, { hasCareRelationship: true });
      const expected = ["DOCTOR_SOAP", "DOCTOR_SUMMARY", "RX_ASSIST", "CDS"].includes(feature);
      expect(withCare, feature).toBe(expected);
    }
  });

  it("admins are denied all clinical AI features", () => {
    for (const feature of FEATURES) {
      for (const role of ROLES.filter((r) => r === "ADMIN")) {
        expect(canAccessAiFeature(role, feature, { hasCareRelationship: true })).toBe(false);
      }
    }
  });
});

describe("streaming route guard parity", () => {
  it("api/ai/chat resolves actor and validates body like server actions", () => {
    const source = readFileSync(
      path.resolve(__dirname, "../../../src/app/api/ai/chat/route.ts"),
      "utf8",
    );
    expect(source).toContain("resolveAiActor");
    expect(source).toContain("assertSameOriginMutation");
    expect(source).toContain("streamChatTurn");
    expect(source).toContain('z.enum(["PATIENT_ASSISTANT", "DOCTOR_SOAP", "DOCTOR_SUMMARY"])');
  });

  it("streamChatTurn applies rate limit and budget before generation", () => {
    const source = readFileSync(
      path.resolve(__dirname, "../../../src/lib/ai/conversations.ts"),
      "utf8",
    );
    expect(source).toContain("checkAiRateLimit");
    expect(source).toContain("checkBudget");
    expect(source).toContain("ensureConversationForChat");
  });
});
