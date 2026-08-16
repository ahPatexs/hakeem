"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { LiveKitRoom, VideoConference, RoomAudioRenderer } from "@livekit/components-react";
import "@livekit/components-styles";
import { useTranslations } from "next-intl";
import { isStubTelemedicineUrl } from "@/domain/platform/video";
import {
  platformAcknowledgeTelehealthConsent,
  platformEndVideoSession,
  platformGetVideoJoinCredentials,
  platformLeaveVideoSession,
  platformRecordVideoReconnect,
} from "@/actions/platform/video";
import { VideoWaitingRoom } from "./waiting-room";
import { ParticipantGrid } from "./participant-grid";
import { CallControls } from "./call-controls";
import type { MediaDeviceSelection } from "./device-selector";

type Phase = "waiting" | "connecting" | "in_call" | "ended";

type Credentials = {
  token: string;
  url: string;
  roomName: string;
  role: "patient" | "doctor";
  sessionId: string;
};

type Props = {
  appointmentId: string;
  role: "patient" | "doctor";
  className?: string;
};

export function VideoSessionShell({ appointmentId, role, className }: Props) {
  const t = useTranslations("platform.video");
  const [phase, setPhase] = useState<Phase>("waiting");
  const [devices, setDevices] = useState<MediaDeviceSelection>({});
  const [creds, setCreds] = useState<Credentials | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [needsConsent, setNeedsConsent] = useState(false);
  const [pending, setPending] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  const stubMode = useMemo(
    () => (creds ? isStubTelemedicineUrl(creds.url) : false),
    [creds],
  );

  const mapJoinError = useCallback(
    (code: string, message?: string) => {
      if (code === "CONSENT_REQUIRED") return t("consentRequired");
      if (code === "FORBIDDEN" && message === "JOIN_WINDOW_CLOSED") return t("joinWindowClosed");
      if (code === "UNAUTHORIZED") return t("joinUnauthorized");
      return t("joinError");
    },
    [t],
  );

  const join = useCallback(async () => {
    setPending(true);
    setError(null);
    setNeedsConsent(false);
    setPhase("connecting");
    const res = await platformGetVideoJoinCredentials({ appointmentId });
    setPending(false);
    if (!res.ok) {
      setNeedsConsent(res.code === "CONSENT_REQUIRED");
      setError(mapJoinError(res.code, "message" in res ? res.message : undefined));
      setPhase("waiting");
      return;
    }
    setCreds({
      token: res.data.token,
      url: res.data.url,
      roomName: res.data.roomName,
      role: res.data.role,
      sessionId: res.data.sessionId,
    });
    setPhase("in_call");
  }, [appointmentId, mapJoinError]);

  const acceptConsentAndJoin = useCallback(async () => {
    setPending(true);
    setError(null);
    const ack = await platformAcknowledgeTelehealthConsent();
    if (!ack.ok) {
      setPending(false);
      setError(t("consentRequired"));
      setNeedsConsent(true);
      return;
    }
    setNeedsConsent(false);
    setPending(false);
    await join();
  }, [join, t]);

  const leave = useCallback(async () => {
    await platformLeaveVideoSession({ appointmentId });
    await platformEndVideoSession({ appointmentId });
    setPhase("ended");
    setCreds(null);
  }, [appointmentId]);

  useEffect(() => {
    if (phase !== "in_call" || !creds || stubMode) return;
    const onOffline = () => {
      void platformRecordVideoReconnect({ appointmentId });
    };
    window.addEventListener("online", onOffline);
    return () => window.removeEventListener("online", onOffline);
  }, [phase, creds, stubMode, appointmentId]);

  if (phase === "waiting" || phase === "connecting") {
    return (
      <div className={className}>
        <VideoWaitingRoom
          role={role}
          devices={devices}
          onDevicesChange={setDevices}
          onReady={() => void join()}
          onAcceptConsent={role === "patient" ? () => void acceptConsentAndJoin() : undefined}
          needsConsent={needsConsent}
          pending={pending || phase === "connecting"}
          error={error}
          demoHint
        />
      </div>
    );
  }

  if (phase === "ended") {
    return (
      <div className={className}>
        <p className="text-center text-on-surface-variant">{t("callEnded")}</p>
      </div>
    );
  }

  if (stubMode && creds) {
    return (
      <div className={className + " space-y-4"}>
        <p
          className="rounded-xl border border-outline-variant/30 bg-surface-container-high px-4 py-2 text-center text-sm font-medium text-primary"
          role="status"
        >
          {t("demoBanner")}
        </p>
        <ParticipantGrid
          participants={[
            { id: "local", name: role === "doctor" ? "Doctor" : "Patient", isLocal: true, muted: !audioEnabled },
            { id: "remote", name: role === "doctor" ? "Patient" : "Doctor", muted: false },
          ]}
        />
        <CallControls
          audioEnabled={audioEnabled}
          videoEnabled={videoEnabled}
          screenSharing={screenSharing}
          chatOpen={false}
          enableScreenShare={false}
          enableInCallChat={false}
          onToggleAudio={() => setAudioEnabled((v) => !v)}
          onToggleVideo={() => setVideoEnabled((v) => !v)}
          onLeave={() => void leave()}
        />
      </div>
    );
  }

  if (!creds) return null;

  return (
    <div className={className + " space-y-4"}>
      <LiveKitRoom
        token={creds.token}
        serverUrl={creds.url}
        connect
        audio={audioEnabled}
        video={videoEnabled}
        onDisconnected={() => {
          void platformRecordVideoReconnect({ appointmentId });
        }}
        className="min-h-[360px] overflow-hidden rounded-2xl"
      >
        <VideoConference />
        <RoomAudioRenderer />
      </LiveKitRoom>
      <CallControls
        audioEnabled={audioEnabled}
        videoEnabled={videoEnabled}
        screenSharing={screenSharing}
        chatOpen={chatOpen}
        onToggleAudio={() => setAudioEnabled((v) => !v)}
        onToggleVideo={() => setVideoEnabled((v) => !v)}
        onToggleScreenShare={() => setScreenSharing((v) => !v)}
        onToggleChat={() => setChatOpen((v) => !v)}
        onLeave={() => void leave()}
      />
    </div>
  );
}
