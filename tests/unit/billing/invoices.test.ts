import { describe, expect, it } from "vitest";
import { formatCreditNoteNumber, formatInvoiceNumber } from "@/domain/billing/invoices";
import { refundableBalance } from "@/domain/admin/billing";

describe("invoice numbering", () => {
  it("formats HK-INV-YYYY-NNNNNN", () => {
    expect(formatInvoiceNumber(2026, 1)).toBe("HK-INV-2026-000001");
    expect(formatInvoiceNumber(2026, 42)).toBe("HK-INV-2026-000042");
  });

  it("formats HK-CN-YYYY-NNNNNN", () => {
    expect(formatCreditNoteNumber(2026, 7)).toBe("HK-CN-2026-000007");
  });
});

describe("remaining balance", () => {
  it("subtracts refunds without going negative", () => {
    expect(refundableBalance(15000, 0)).toBe(15000);
    expect(refundableBalance(15000, 5000)).toBe(10000);
    expect(refundableBalance(15000, 15000)).toBe(0);
    expect(refundableBalance(15000, 16000)).toBe(0);
  });
});
