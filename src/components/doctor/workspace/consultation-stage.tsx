"use client";

import { Video } from "lucide-react";
import { useTranslations } from "next-intl";
import { VideoSessionShell } from "@/components/platform/video";
import { portalCardClass } from "@/components/portal/chrome";
import { cn } from "@/lib/utils";

export function ConsultationStage({
  appointmentId,
  patientName,
  doctorName,
}: {
  appointmentId: string;
  patientName: string;
  doctorName: string;
}) {
  const t = useTranslations("doctor.workspace");

  return (
    <section className={cn(portalCardClass, "overflow-hidden")}>
      <div className="flex items-center gap-2 border-b border-outline-variant/15 px-5 py-3">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-med-green/15 text-med-green">
          <Video className="h-4 w-4" aria-hidden />
        </span>
        <div>
          <h2 className="font-headline text-base text-primary">{t("stageTitle")}</h2>
          <p className="text-xs text-on-surface-variant">{t("stageHint", { patient: patientName })}</p>
        </div>
      </div>
      <div className="p-4 md:p-5">
        <VideoSessionShell
          appointmentId={appointmentId}
          role="doctor"
          embedded
          localName={doctorName}
          remoteName={patientName}
        />
      </div>
    </section>
  );
}
