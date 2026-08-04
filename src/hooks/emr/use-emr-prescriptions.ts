"use client";

import { useQuery } from "@tanstack/react-query";
import { emrListPrescriptions } from "@/actions/emr/prescriptions";

export function useEmrPrescriptions(opts: {
  patientUserId: string;
  bucket?: "active" | "history" | "all";
  q?: string;
  page?: number;
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: [
      "emr",
      "prescriptions",
      opts.patientUserId,
      opts.bucket ?? "active",
      opts.q ?? null,
      opts.page ?? 1,
    ],
    queryFn: async () => {
      const result = await emrListPrescriptions({
        patientUserId: opts.patientUserId,
        bucket: opts.bucket,
        q: opts.q,
        page: opts.page,
      });
      if (!result.ok) {
        throw new Error(result.code);
      }
      return result.data;
    },
    enabled: opts.enabled !== false && Boolean(opts.patientUserId),
  });
}
