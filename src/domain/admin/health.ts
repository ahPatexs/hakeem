import type { HealthComponentKey, HealthOverallStatus } from "@prisma/client";

export type HealthComponent = {
  key: HealthComponentKey;
  ok: boolean;
  message: string;
  latencyMs?: number;
};

export function deriveOverallStatus(components: HealthComponent[]): HealthOverallStatus {
  const critical = components.filter((c) => c.key === "DATABASE" || c.key === "APP");
  if (critical.some((c) => !c.ok)) return "DOWN";
  if (components.some((c) => !c.ok)) return "DEGRADED";
  return "HEALTHY";
}
