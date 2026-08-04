"use client";

import { useCallback, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  platformGetVideoJoinCredentials,
  platformLeaveVideoSession,
  platformRecordVideoReconnect,
} from "@/actions/platform/video";

export type VideoSessionCredentials = {
  token: string;
  url: string;
  roomName: string;
  expiresAt: string;
  role: "patient" | "doctor";
  sessionId: string;
};

export function useVideoSession(appointmentId: string, enabled = false) {
  const queryClient = useQueryClient();
  const [connectionState, setConnectionState] = useState<
    "idle" | "connecting" | "connected" | "reconnecting" | "error"
  >("idle");

  const query = useQuery({
    queryKey: ["platform", "video-session", appointmentId],
    enabled: enabled && Boolean(appointmentId),
    queryFn: async (): Promise<VideoSessionCredentials> => {
      setConnectionState("connecting");
      const res = await platformGetVideoJoinCredentials({ appointmentId });
      if (!res.ok) {
        setConnectionState("error");
        throw new Error(res.code);
      }
      setConnectionState("connected");
      return res.data;
    },
    staleTime: 30_000,
    retry: 1,
  });

  const refreshCredentials = useCallback(async () => {
    setConnectionState("reconnecting");
    await platformRecordVideoReconnect({ appointmentId });
    await queryClient.invalidateQueries({
      queryKey: ["platform", "video-session", appointmentId],
    });
  }, [appointmentId, queryClient]);

  const leave = useCallback(async () => {
    await platformLeaveVideoSession({ appointmentId });
    setConnectionState("idle");
    queryClient.removeQueries({ queryKey: ["platform", "video-session", appointmentId] });
  }, [appointmentId, queryClient]);

  return {
    ...query,
    connectionState,
    refreshCredentials,
    leave,
  };
}
