"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";

export type VideoOpsRow = {
  appointmentId: string;
  patientName: string;
  doctorName: string;
  stateLabel: string;
  when: string;
  duration: string;
};

export function VideoOpsTable({ rows }: { rows: VideoOpsRow[] }) {
  const t = useTranslations("admin.video");

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[40rem] text-start text-sm">
        <thead className="text-xs uppercase text-on-surface-variant">
          <tr className="border-b border-outline-variant/15">
            <th className="py-2 pe-3 font-medium">{t("colPatient")}</th>
            <th className="py-2 pe-3 font-medium">{t("colDoctor")}</th>
            <th className="py-2 pe-3 font-medium">{t("colState")}</th>
            <th className="py-2 pe-3 font-medium">{t("colWhen")}</th>
            <th className="py-2 pe-3 font-medium">{t("colDuration")}</th>
            <th className="py-2 font-medium" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.appointmentId} className="border-b border-outline-variant/10">
              <td className="py-3 pe-3 font-medium text-primary">{row.patientName}</td>
              <td className="py-3 pe-3 text-on-surface-variant">{row.doctorName}</td>
              <td className="py-3 pe-3">
                <span className="rounded-full bg-primary/8 px-2.5 py-0.5 text-xs font-semibold text-primary">
                  {row.stateLabel}
                </span>
              </td>
              <td className="py-3 pe-3 text-on-surface-variant">{row.when}</td>
              <td className="py-3 pe-3 tabular-nums text-on-surface-variant">{row.duration}</td>
              <td className="py-3 text-end">
                <Link
                  href={`/admin/video/${row.appointmentId}`}
                  className="text-sm font-semibold text-med-green hover:underline"
                >
                  {t("inspect")}
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
