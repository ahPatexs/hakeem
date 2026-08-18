import { prisma } from "@/lib/prisma";
import { BILLING_TIME_ZONE, CREDIT_NOTE_PREFIX, INVOICE_PREFIX } from "@/domain/billing/constants";

export function billingYear(at = new Date()): number {
  const year = new Intl.DateTimeFormat("en-US", {
    timeZone: BILLING_TIME_ZONE,
    year: "numeric",
  }).format(at);
  return Number(year);
}

export function formatInvoiceNumber(year: number, sequence: number): string {
  return `${INVOICE_PREFIX}-${year}-${String(sequence).padStart(6, "0")}`;
}

export function formatCreditNoteNumber(year: number, sequence: number): string {
  return `${CREDIT_NOTE_PREFIX}-${year}-${String(sequence).padStart(6, "0")}`;
}

async function nextSequence(kind: "INV" | "CN", at = new Date()): Promise<{ year: number; n: number }> {
  const year = billingYear(at);
  const row = await prisma.invoiceSequence.upsert({
    where: { kind_year: { kind, year } },
    create: { kind, year, lastNumber: 1 },
    update: { lastNumber: { increment: 1 } },
  });
  return { year, n: row.lastNumber };
}

export async function allocateInvoiceNumber(at = new Date()): Promise<string> {
  const { year, n } = await nextSequence("INV", at);
  return formatInvoiceNumber(year, n);
}

export async function allocateCreditNoteNumber(at = new Date()): Promise<string> {
  const { year, n } = await nextSequence("CN", at);
  return formatCreditNoteNumber(year, n);
}
