type AnalyticsProps = Record<string, string | number | boolean | undefined>;

let consented = false;

export function setAnalyticsConsent(value: boolean) {
  consented = value;
}

export function trackEvent(name: string, props?: AnalyticsProps) {
  if (!consented && process.env.NODE_ENV === "production") return;
  if (typeof window !== "undefined") {
    // eslint-disable-next-line no-console
    console.debug("[analytics]", name, props ?? {});
  }
}
