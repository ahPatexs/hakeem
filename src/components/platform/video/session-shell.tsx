"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LiveKitRoom } from "@livekit/components-react";
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
import { VisitChat } from "./visit-chat";
import { LiveKitVisitChat } from "./livekit-visit-chat";
import { LiveKitConferenceStage, LiveKitMediaSync, LiveKitScreenShareSync } from "./livekit-stage";
import type { MediaDeviceSelection } from "./device-selector";
import { cn } from "@/lib/utils";

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
  embedded?: boolean;
  localName?: string;
  remoteName?: string;
};

export function VideoSessionShell({
  appointmentId,
  role,
  className,
  embedded,
  localName,
  remoteName,
}: Props) {
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
  const [chatOpen, setChatOpen] = useState(true);
  const screenShareToggleRef = useRef<(() => void) | null>(null);

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

  const controls = (
    <CallControls
      audioEnabled={audioEnabled}
      videoEnabled={videoEnabled}
      screenSharing={screenSharing}
      chatOpen={chatOpen}
      enableScreenShare={!stubMode}
      enableInCallChat
      onToggleAudio={() => setAudioEnabled((value) => !value)}
      onToggleVideo={() => setVideoEnabled((value) => !value)}
      onToggleScreenShare={() => screenShareToggleRef.current?.()}
      onToggleChat={() => setChatOpen((value) => !value)}
      onLeave={() => void leave()}
    />
  );

  const chat = chatOpen ? <VisitChat appointmentId={appointmentId} role={role} /> : null;
  const liveChat = chatOpen ? (
    <LiveKitVisitChat
      appointmentId={appointmentId}
      role={role}
      className="h-full min-h-0 w-full rounded-none border-0"
    />
  ) : null;

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
          compact={embedded}
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
      <div className={cn("space-y-4", className)}>
        <p
          className="rounded-xl border border-outline-variant/30 bg-surface-container-high px-4 py-2 text-center text-sm font-medium text-primary"
          role="status"
        >
          {t("demoBanner")}
        </p>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-stretch">
          <div className="min-w-0 flex-1 space-y-3">
            <ParticipantGrid
              participants={[
                {
                  id: "local",
                  name: localName ?? (role === "doctor" ? "Doctor" : "Patient"),
                  isLocal: true,
                  muted: !audioEnabled,
                },
                {
                  id: "remote",
                  name: remoteName ?? (role === "doctor" ? "Patient" : "Doctor"),
                  muted: false,
                },
              ]}
            />
            {controls}
          </div>
          {chat}
        </div>
      </div>
    );
  }

  if (!creds) return null;

  return (
    <div className={className}>
      <div className="space-y-3">
        <LiveKitRoom
          token={creds.token}
          serverUrl={creds.url}
          connect
          audio={audioEnabled}
          video={videoEnabled}
          onDisconnected={() => {
            void platformRecordVideoReconnect({ appointmentId });
          }}
          className="overflow-hidden rounded-2xl border border-outline-variant/20 bg-[#071525]"
        >
          <div className="flex h-[min(68vh,560px)] min-h-[320px] flex-col lg:flex-row">
            <div className="relative min-h-[240px] min-w-0 flex-1" data-lk-theme="default">
              <LiveKitConferenceStage />
              <LiveKitMediaSync audioEnabled={audioEnabled} videoEnabled={videoEnabled} />
              <LiveKitScreenShareSync
                toggleRef={screenShareToggleRef}
                onScreenSharingChange={setScreenSharing}
              />
            </div>
            {liveChat}
          </div>
        </LiveKitRoom>
        {controls}
      </div>
    </div>
  );
}
