import { describe, expect, it } from "vitest";
import { assertCanApprove, assertCanReject } from "@/domain/admin/doctor-approval";
import { AdminDomainError } from "@/domain/admin/errors";

describe("doctor approve / reject integration", () => {
  it("enforces terminal-state guards for approve and reject", () => {
    expect(() => assertCanApprove("PENDING_APPROVAL")).not.toThrow();
    expect(() => assertCanReject("PENDING_APPROVAL")).not.toThrow();
    expect(() => assertCanApprove("APPROVED")).toThrow(AdminDomainError);
    expect(() => assertCanReject("REJECTED")).toThrow(AdminDomainError);
    // Rejected may be re-approved (lifecycle allows re-open)
    expect(() => assertCanApprove("REJECTED")).not.toThrow();
  });
});
