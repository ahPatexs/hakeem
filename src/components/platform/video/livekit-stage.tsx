"use client";

import { useEffect, type MutableRefObject } from "react";
import {
  GridLayout,
  ParticipantTile,
  RoomAudioRenderer,
  useLocalParticipant,
  useTracks,
} from "@livekit/components-react";
import { Track } from "livekit-client";

export function LiveKitConferenceStage() {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false },
  );

  return (
    <>
      <GridLayout tracks={tracks} className="h-full min-h-[240px]">
        <ParticipantTile />
      </GridLayout>
      <RoomAudioRenderer />
    </>
  );
}

export function LiveKitMediaSync({
  audioEnabled,
  videoEnabled,
}: {
  audioEnabled: boolean;
  videoEnabled: boolean;
}) {
  const { localParticipant } = useLocalParticipant();

  useEffect(() => {
    void localParticipant.setMicrophoneEnabled(audioEnabled);
  }, [audioEnabled, localParticipant]);

  useEffect(() => {
    void localParticipant.setCameraEnabled(videoEnabled);
  }, [videoEnabled, localParticipant]);

  return null;
}

export function LiveKitScreenShareSync({
  toggleRef,
  onScreenSharingChange,
}: {
  toggleRef: MutableRefObject<(() => void) | null>;
  onScreenSharingChange: (enabled: boolean) => void;
}) {
  const { localParticipant, isScreenShareEnabled } = useLocalParticipant();

  useEffect(() => {
    onScreenSharingChange(isScreenShareEnabled);
  }, [isScreenShareEnabled, onScreenSharingChange]);

  useEffect(() => {
    toggleRef.current = () => {
      void localParticipant.setScreenShareEnabled(!isScreenShareEnabled);
    };
    return () => {
      toggleRef.current = null;
    };
  }, [isScreenShareEnabled, localParticipant, toggleRef]);

  return null;
}
