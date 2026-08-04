import { describe, expect, it } from "vitest";
import {
  applyEscalateOnly,
  maxOutcome,
  outcomeRank,
  parseLlmProposal,
} from "@/lib/ai/symptom";

describe("symptom outcome escalate-only rule", () => {
  it("does not change LLM proposal when red-flag is absent", () => {
    expect(applyEscalateOnly("SELF_CARE", false)).toBe("SELF_CARE");
    expect(applyEscalateOnly("SEE_DOCTOR", false)).toBe("SEE_DOCTOR");
    expect(applyEscalateOnly("URGENT", false)).toBe("URGENT");
    expect(applyEscalateOnly("EMERGENCY", false)).toBe("EMERGENCY");
  });

  it("escalates any lower LLM proposal to EMERGENCY when red-flag fires", () => {
    expect(applyEscalateOnly("SELF_CARE", true)).toBe("EMERGENCY");
    expect(applyEscalateOnly("SEE_DOCTOR", true)).toBe("EMERGENCY");
    expect(applyEscalateOnly("URGENT", true)).toBe("EMERGENCY");
  });

  it("never downgrades an LLM EMERGENCY proposal", () => {
    expect(applyEscalateOnly("EMERGENCY", true)).toBe("EMERGENCY");
    expect(applyEscalateOnly("EMERGENCY", false)).toBe("EMERGENCY");
  });

  it("ranks outcomes by severity for escalate-only merges", () => {
    expect(outcomeRank("SELF_CARE")).toBeLessThan(outcomeRank("SEE_DOCTOR"));
    expect(outcomeRank("SEE_DOCTOR")).toBeLessThan(outcomeRank("URGENT"));
    expect(outcomeRank("URGENT")).toBeLessThan(outcomeRank("EMERGENCY"));
    expect(maxOutcome("SELF_CARE", "URGENT")).toBe("URGENT");
    expect(maxOutcome("EMERGENCY", "SELF_CARE")).toBe("EMERGENCY");
  });
});

describe("parseLlmProposal", () => {
  it("parses question JSON", () => {
    const p = parseLlmProposal(
      '{"type":"question","question":"How long have symptoms lasted?"}',
      "en",
      false,
    );
    expect(p).toEqual({
      type: "question",
      question: "How long have symptoms lasted?",
    });
  });

  it("parses outcome JSON and never invents a diagnosis label", () => {
    const p = parseLlmProposal(
      '{"type":"outcome","kind":"SELF_CARE","rationale":"Mild symptoms suggest rest."}',
      "en",
      false,
    );
    expect(p.type).toBe("outcome");
    if (p.type === "outcome") {
      expect(p.kind).toBe("SELF_CARE");
      expect(p.rationale).toMatch(/Mild/);
    }
  });

  it("forces outcome shape when max steps reached", () => {
    const p = parseLlmProposal("some free text rationale", "en", true);
    expect(p.type).toBe("outcome");
  });
});
