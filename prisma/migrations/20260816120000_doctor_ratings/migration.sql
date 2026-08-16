-- AlterTable
ALTER TABLE "Doctor" ADD COLUMN "ratingAvg" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Doctor" ADD COLUMN "ratingCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "SearchDoctorProjection" ADD COLUMN "ratingAvg" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "SearchDoctorProjection" ADD COLUMN "ratingCount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "DoctorRating" (
    "id" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "patientUserId" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DoctorRating_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DoctorRating_appointmentId_key" ON "DoctorRating"("appointmentId");
CREATE INDEX "DoctorRating_doctorId_createdAt_idx" ON "DoctorRating"("doctorId", "createdAt");
CREATE INDEX "DoctorRating_patientUserId_idx" ON "DoctorRating"("patientUserId");
CREATE INDEX "SearchDoctorProjection_ratingAvg_ratingCount_idx" ON "SearchDoctorProjection"("ratingAvg", "ratingCount");

ALTER TABLE "DoctorRating" ADD CONSTRAINT "DoctorRating_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DoctorRating" ADD CONSTRAINT "DoctorRating_patientUserId_fkey" FOREIGN KEY ("patientUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DoctorRating" ADD CONSTRAINT "DoctorRating_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DoctorRating" ADD CONSTRAINT "DoctorRating_score_check" CHECK ("score" >= 1 AND "score" <= 5);
