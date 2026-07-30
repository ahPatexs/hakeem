import { prisma } from "@/lib/prisma";
import { AdminDomainError } from "@/domain/admin/errors";
import type { DoctorApprovalStatus } from "@prisma/client";

export async function assertDoctorPending(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, doctorApproval: true },
  });
  if (!user || user.role !== "DOCTOR") throw new AdminDomainError("NOT_FOUND");
  return user;
}

export function assertCanApprove(current: DoctorApprovalStatus | null) {
  if (current === "APPROVED") throw new AdminDomainError("ALREADY_APPROVED");
}

export function assertCanReject(current: DoctorApprovalStatus | null) {
  if (current === "REJECTED") throw new AdminDomainError("ALREADY_REJECTED");
}

export async function setDoctorBookable(doctorProfileId: string | null, bookable: boolean) {
  if (!doctorProfileId) return;
  await prisma.doctor.updateMany({
    where: { id: doctorProfileId },
    data: { isAvailable: bookable },
  });
  const { enqueueDoctorSearchRefresh } = await import("@/lib/platform/search");
  await enqueueDoctorSearchRefresh(doctorProfileId);
}
