"use client";

import { useMutation, useQuery } from "@tanstack/react-query";

export type UploadScanStatus = "PENDING" | "CLEAN" | "REJECTED";

export function useUpload(config: {
  queryKey: readonly unknown[];
  uploadId?: string;
  fetchScanStatus?: (uploadId: string) => Promise<{ scanStatus: UploadScanStatus }>;
  uploadFile?: (file: File) => Promise<{ uploadId: string }>;
  pollIntervalMs?: number;
}) {
  const statusQuery = useQuery({
    queryKey: [...config.queryKey, config.uploadId],
    queryFn: () => {
      if (!config.uploadId || !config.fetchScanStatus) {
        throw new Error("uploadId and fetchScanStatus required");
      }
      return config.fetchScanStatus(config.uploadId);
    },
    enabled: Boolean(config.uploadId && config.fetchScanStatus),
    refetchInterval: (query) => {
      const status = query.state.data?.scanStatus;
      if (status === "PENDING") return config.pollIntervalMs ?? 3000;
      return false;
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!config.uploadFile) throw new Error("uploadFile not configured");
      return config.uploadFile(file);
    },
  });

  return {
    scanStatus: statusQuery.data?.scanStatus,
    isScanPending: statusQuery.data?.scanStatus === "PENDING",
    upload: uploadMutation.mutateAsync,
    isUploading: uploadMutation.isPending,
    uploadError: uploadMutation.error,
  };
}
