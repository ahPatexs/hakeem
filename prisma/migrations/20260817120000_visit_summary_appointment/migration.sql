-- Link visit summaries to the appointment they belong to so patients
-- receive one shared record per visit.

ALTER TABLE "MedicalRecord" ADD COLUMN "appointmentId" TEXT;

CREATE UNIQUE INDEX "MedicalRecord_appointmentId_recordType_key" ON "MedicalRecord"("appointmentId", "recordType");
CREATE INDEX "MedicalRecord_appointmentId_idx" ON "MedicalRecord"("appointmentId");

ALTER TABLE "MedicalRecord" ADD CONSTRAINT "MedicalRecord_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
