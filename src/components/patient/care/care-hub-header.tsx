import type { ReactNode } from "react";
import { WelcomeBanner, GlanceStat } from "@/components/portal/welcome-banner";

export type CareHubStat = {
  label: string;
  value: string | number;
  hint?: string;
};

export function CareHubHeader({
  eyebrow,
  title,
  subtitle,
  stats,
  action,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  stats: CareHubStat[];
  action?: ReactNode;
}) {
  return (
    <WelcomeBanner
      eyebrow={eyebrow}
      title={title}
      subtitle={subtitle}
      action={action}
      aside={
        <>
          {stats.map((stat) => (
            <GlanceStat key={stat.label} label={stat.label} value={stat.value} hint={stat.hint} />
          ))}
        </>
      }
    />
  );
}
