"use client";

import { Mic, MicOff, Video, VideoOff, MonitorUp, MessageSquare, PhoneOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

type Props = {
  audioEnabled: boolean;
  videoEnabled: boolean;
  screenSharing: boolean;
  chatOpen: boolean;
  enableScreenShare?: boolean;
  enableInCallChat?: boolean;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare?: () => void;
  onToggleChat?: () => void;
  onLeave: () => void;
};

export function CallControls({
  audioEnabled,
  videoEnabled,
  screenSharing,
  chatOpen,
  enableScreenShare = true,
  enableInCallChat = true,
  onToggleAudio,
  onToggleVideo,
  onToggleScreenShare,
  onToggleChat,
  onLeave,
}: Props) {
  const t = useTranslations("platform.video");

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 rounded-2xl border border-outline-variant/20 bg-surface-container-low p-3">
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label={audioEnabled ? t("mute") : t("unmute")}
        aria-pressed={!audioEnabled}
        onClick={onToggleAudio}
      >
        {audioEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
      </Button>
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label={videoEnabled ? t("cameraOff") : t("cameraOn")}
        aria-pressed={!videoEnabled}
        onClick={onToggleVideo}
      >
        {videoEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
      </Button>
      {enableScreenShare ? (
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={t("screenShare")}
          aria-pressed={screenSharing}
          onClick={onToggleScreenShare}
        >
          <MonitorUp className="h-4 w-4" />
        </Button>
      ) : null}
      {enableInCallChat ? (
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={t("chat")}
          aria-pressed={chatOpen}
          onClick={onToggleChat}
        >
          <MessageSquare className="h-4 w-4" />
        </Button>
      ) : null}
      <Button type="button" variant="soft" size="icon" aria-label={t("leave")} onClick={onLeave} className="bg-warm-coral/15 text-warm-coral">
        <PhoneOff className="h-4 w-4" />
      </Button>
    </div>
  );
}
