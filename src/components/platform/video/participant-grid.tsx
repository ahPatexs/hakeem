"use client";

import { cn } from "@/lib/utils";

type Tile = {
  id: string;
  name: string;
  isLocal?: boolean;
  muted?: boolean;
};

type Props = {
  participants: Tile[];
  className?: string;
  children?: React.ReactNode;
};

export function ParticipantGrid({ participants, className, children }: Props) {
  return (
    <div
      className={cn(
        "grid gap-3",
        participants.length <= 1 ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2",
        className,
      )}
    >
      {children}
      {participants.map((p) => (
        <div
          key={p.id}
          className="relative aspect-video overflow-hidden rounded-2xl border border-outline-variant/20 bg-surface-container-low"
        >
          <div className="absolute inset-0 flex items-center justify-center text-on-surface-variant">
            <span className="text-sm font-medium">{p.name}</span>
          </div>
          <div className="absolute bottom-2 start-2 rounded-full bg-black/50 px-2 py-0.5 text-xs text-white">
            {p.isLocal ? "You" : p.name}
            {p.muted ? " · muted" : ""}
          </div>
        </div>
      ))}
    </div>
  );
}
