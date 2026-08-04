"use client";

import { useState, useTransition } from "react";
import { platformListVideoCallEvents } from "@/actions/platform/video";

type CallEvent = {
  id: string;
  kind: string;
  actorUserId: string | null;
  createdAt: string;
};

export function VideoCallLogCard() {
  const [appointmentId, setAppointmentId] = useState("");
  const [events, setEvents] = useState<CallEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function load() {
    const id = appointmentId.trim();
    if (!id) {
      setError("VALIDATION_ERROR");
      return;
    }
    setError(null);
    startTransition(() => {
      void platformListVideoCallEvents({ appointmentId: id }).then((res) => {
        if (!res.ok) {
          setEvents(null);
          setError(res.code);
          return;
        }
        setEvents(res.data.events);
      });
    });
  }

  return (
    <div className="rounded-xl border border-outline-variant/20 p-4">
      <h2 className="font-headline text-lg text-primary">Video call log</h2>
      <p className="mt-1 text-sm text-on-surface-variant">
        Look up session events by appointment id.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <input
          className="min-w-[16rem] flex-1 rounded-lg border border-outline-variant/30 bg-transparent px-3 py-2 text-sm"
          placeholder="Appointment id"
          value={appointmentId}
          onChange={(e) => setAppointmentId(e.target.value)}
        />
        <button
          type="button"
          className="rounded-lg bg-primary px-3 py-2 text-sm text-on-primary disabled:opacity-50"
          disabled={pending}
          onClick={load}
        >
          {pending ? "Loading…" : "Load"}
        </button>
      </div>
      {error ? <p className="mt-2 text-sm text-warm-coral">{error}</p> : null}
      {events ? (
        events.length === 0 ? (
          <p className="mt-3 text-sm text-on-surface-variant">No events for this session.</p>
        ) : (
          <ul className="mt-3 max-h-64 space-y-1 overflow-y-auto text-sm">
            {events.map((e) => (
              <li
                key={e.id}
                className="flex flex-wrap items-baseline justify-between gap-2 border-b border-outline-variant/10 py-1"
              >
                <span className="font-medium text-primary">{e.kind}</span>
                <span className="text-on-surface-variant">
                  {new Date(e.createdAt).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )
      ) : null}
    </div>
  );
}
