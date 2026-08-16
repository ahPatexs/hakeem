-- Doctor-owned weekly hours and full-day exceptions for care-loop booking
CREATE TABLE "DoctorWeeklyHours" (
    "id" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "weekday" INTEGER NOT NULL,
    "startMinutes" INTEGER NOT NULL,
    "endMinutes" INTEGER NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Riyadh',

    CONSTRAINT "DoctorWeeklyHours_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DoctorUnavailableDay" (
    "id" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "reason" TEXT,

    CONSTRAINT "DoctorUnavailableDay_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DoctorWeeklyHours_doctorId_weekday_key" ON "DoctorWeeklyHours"("doctorId", "weekday");
CREATE INDEX "DoctorWeeklyHours_doctorId_idx" ON "DoctorWeeklyHours"("doctorId");
CREATE UNIQUE INDEX "DoctorUnavailableDay_doctorId_date_key" ON "DoctorUnavailableDay"("doctorId", "date");
CREATE INDEX "DoctorUnavailableDay_doctorId_idx" ON "DoctorUnavailableDay"("doctorId");

ALTER TABLE "DoctorWeeklyHours" ADD CONSTRAINT "DoctorWeeklyHours_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DoctorUnavailableDay" ADD CONSTRAINT "DoctorUnavailableDay_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
