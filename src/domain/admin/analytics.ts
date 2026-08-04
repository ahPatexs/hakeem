import { EXPORT_ROW_CAP } from "@/domain/admin/constants";
import { AdminDomainError } from "@/domain/admin/errors";

export type AnalyticsPeriod = "7d" | "30d" | "90d";

export function periodToDays(period: AnalyticsPeriod): number {
  switch (period) {
    case "7d":
      return 7;
    case "30d":
      return 30;
    case "90d":
      return 90;
  }
}

export function assertExportCap(rowCount: number) {
  if (rowCount > EXPORT_ROW_CAP) throw new AdminDomainError("EXPORT_TOO_LARGE");
}

export function bucketByDay(dates: Date[]): Record<string, number> {
  const buckets: Record<string, number> = {};
  for (const d of dates) {
    const key = d.toISOString().slice(0, 10);
    buckets[key] = (buckets[key] ?? 0) + 1;
  }
  return buckets;
}
