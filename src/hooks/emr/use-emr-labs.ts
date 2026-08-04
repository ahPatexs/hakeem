"use client";

import { useQuery } from "@tanstack/react-query";
import { emrListLabResults } from "@/actions/emr/diagnostics";

export function useEmrLabs(opts: {
  patientUserId: string;
  q?: string;
  page?: number;
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: ["emr", "labs", opts.patientUserId, opts.q ?? null, opts.page ?? 1],
    queryFn: async () => {
      const result = await emrListLabResults({
        patientUserId: opts.patientUserId,
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
