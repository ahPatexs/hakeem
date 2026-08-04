import { describe, expect, it } from "vitest";
import { supersededActivePlanIds } from "@/domain/emr/plan";

describe("supersededActivePlanIds (care plan publish versioning)", () => {
  const plans = [
    { id: "draft-1", status: "ACTIVE", kind: "CARE" },
    { id: "other-active", status: "ACTIVE", kind: "CARE" },
    { id: "other-kind-active", status: "ACTIVE", kind: "DIET" },
    { id: "completed-1", status: "COMPLETED", kind: "CARE" },
  ];

  it("supersedes only ACTIVE plans of the same kind, excluding the newly published plan", () => {
    const superseded = supersededActivePlanIds(plans, "draft-1", "CARE");
    expect(superseded).toEqual(["other-active"]);
  });

  it("does not touch a different kind's active plan", () => {
    const superseded = supersededActivePlanIds(plans, "draft-1", "CARE");
    expect(superseded).not.toContain("other-kind-active");
  });

  it("returns an empty list when there is nothing to supersede", () => {
    const superseded = supersededActivePlanIds(
      [{ id: "draft-1", status: "ACTIVE", kind: "CARE" }],
      "draft-1",
      "CARE",
    );
    expect(superseded).toEqual([]);
  });

  it("ignores already-completed plans", () => {
    const superseded = supersededActivePlanIds(plans, "other-active", "CARE");
    expect(superseded).not.toContain("completed-1");
  });
});
