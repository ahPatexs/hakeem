import {
  FileText,
  Video,
  CalendarCheck,
  BadgeCheck,
  Stethoscope,
  Users,
  Timer,
} from "lucide-react";
import type { FeatureCard, StatItem } from "@/content/types";

const iconMap = {
  description: FileText,
  videocam: Video,
  event_available: CalendarCheck,
  verified: BadgeCheck,
  medical_services: Stethoscope,
  groups: Users,
  timer: Timer,
} as const;

const toneClass: Record<FeatureCard["tone"], string> = {
  primary: "bg-primary-fixed text-primary",
  secondary: "bg-secondary-container text-secondary",
  tertiary: "bg-tertiary-fixed text-tertiary",
  accent: "bg-on-primary-container text-on-primary",
};

export function FeatureCards({
  title,
  subtitle,
  items,
}: {
  title: string;
  subtitle: string;
  items: FeatureCard[];
}) {
  return (
    <section className="mx-auto max-w-7xl px-margin-mobile py-2xl md:px-margin-desktop" id="services">
      <div className="mb-16 space-y-4 text-center">
        <h2 className="font-headline text-headline-lg text-primary">{title}</h2>
        <p className="mx-auto max-w-2xl text-on-surface-variant">{subtitle}</p>
      </div>
      <div className="grid gap-gutter md:grid-cols-2 lg:grid-cols-4">
        {items.map((item) => {
          const Icon = iconMap[item.iconKey as keyof typeof iconMap] ?? FileText;
          return (
            <article
              key={item.title}
              className="glass-card flex flex-col items-start gap-4 rounded-2xl p-8 transition-transform duration-300 hover:-translate-y-2"
            >
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${toneClass[item.tone]}`}>
                <Icon className="h-6 w-6" aria-hidden />
              </div>
              <h3 className="font-headline text-primary">{item.title}</h3>
              <p className="text-sm text-on-surface-variant">{item.description}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export function Statistics({ items }: { items: StatItem[] }) {
  return (
    <section className="relative z-20 border-y border-outline-variant/10 bg-white py-12">
      <div className="mx-auto max-w-7xl px-margin-mobile md:px-margin-desktop">
        <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
          {items.map((item) => {
            const Icon = iconMap[item.iconKey as keyof typeof iconMap] ?? Stethoscope;
            return (
              <div
                key={item.label}
                className="rounded-2xl border border-outline-variant/20 bg-surface/50 p-6 transition-shadow hover:shadow-md"
              >
                <div className="flex flex-col items-center space-y-2 text-center">
                  <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary/5 text-primary">
                    <Icon className="h-5 w-5" aria-hidden />
                  </div>
                  <h4 className="font-headline text-2xl leading-tight text-primary">{item.value}</h4>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                    {item.label}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
