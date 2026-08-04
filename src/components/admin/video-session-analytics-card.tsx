"use client";

import { useEffect, useState } from "react";
import { platformGetVideoSessionAnalytics } from "@/actions/platform/video";

export function VideoSessionAnalyticsCard() {
  const [summary, setSummary] = useState<{
    sessionCount: number;
    joinedCount: number;
    deniedCount: number;
    reconnectCount: number;
    avgDurationSeconds: number | null;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const to = new Date();
    const from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    void platformGetVideoSessionAnalytics({
      from: from.toISOString(),
      to: to.toISOString(),
    }).then((res) => {
      if (!res.ok) {
        setError(res.code);
        return;
      }
      setSummary(res.data);
    });
  }, []);

  return (
    <div className="rounded-xl border border-outline-variant/20 p-4">
      <h2 className="font-headline text-lg text-primary">Video sessions (7d)</h2>
      {error ? <p className="mt-2 text-sm text-warm-coral">{error}</p> : null}
      {summary ? (
        <dl className="mt-3 grid grid-cols-2 gap-2 text-sm md:grid-cols-4">
          <div>
            <dt className="text-on-surface-variant">Sessions</dt>
            <dd className="font-medium">{summary.sessionCount}</dd>
          </div>
          <div>
            <dt className="text-on-surface-variant">Joins</dt>
            <dd className="font-medium">{summary.joinedCount}</dd>
          </div>
          <div>
            <dt className="text-on-surface-variant">Denials</dt>
            <dd className="font-medium">{summary.deniedCount}</dd>
          </div>
          <div>
            <dt className="text-on-surface-variant">Avg duration</dt>
            <dd className="font-medium">
              {summary.avgDurationSeconds == null ? "—" : `${summary.avgDurationSeconds}s`}
            </dd>
          </div>
        </dl>
      ) : !error ? (
        <p className="mt-2 text-sm text-on-surface-variant">Loading…</p>
      ) : null}
    </div>
  );
}
