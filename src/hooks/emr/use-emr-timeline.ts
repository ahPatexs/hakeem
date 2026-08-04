"use client";

import { useQuery } from "@tanstack/react-query";
import { emrListTimeline } from "@/actions/emr/timeline";
import type { EmrTimelineEventType } from "@/domain/emr/timeline";

export function useEmrTimeline(opts: {
  patientUserId: string;
  types?: EmrTimelineEventType[];
  q?: string;
  from?: string;
  to?: string;
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: [
      "emr",
      "timeline",
      opts.patientUserId,
      opts.types ?? null,
      opts.q ?? null,
      opts.from ?? null,
      opts.to ?? null,
    ],
    queryFn: async () => {
      const result = await emrListTimeline({
        patientUserId: opts.patientUserId,
        types: opts.types,
        from: opts.from ? new Date(opts.from) : undefined,
        to: opts.to ? new Date(opts.to) : undefined,
      });
      if (!result.ok) {
        throw new Error(result.code);
      }
      return result.data;
    },
    enabled: opts.enabled !== false && Boolean(opts.patientUserId),
  });
}
