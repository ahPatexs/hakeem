import type { WorkflowStep } from "@/content/types";

export function HowItWorksPreview({
  title,
  steps,
}: {
  title: string;
  steps: WorkflowStep[];
}) {
  return (
    <section className="bg-surface-container py-2xl" id="ai-features">
      <div className="mx-auto max-w-7xl px-margin-mobile md:px-margin-desktop">
        <div className="grid items-center gap-16 lg:grid-cols-2">
          <div className="space-y-8">
            <h2 className="font-headline text-headline-lg text-primary">{title}</h2>
            <div className="space-y-6">
              {steps.map((step) => (
                <div key={step.step} className="flex gap-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary font-bold text-white">
                    {step.step}
                  </div>
                  <div>
                    <h4 className="font-headline text-primary">{step.title}</h4>
                    <p className="text-sm text-on-surface-variant">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative overflow-hidden rounded-3xl border border-outline-variant/20 bg-white p-8 shadow-xl">
            <div className="flex flex-col items-center gap-6 py-8">
              <div className="flex w-full items-center gap-4">
                <div className="flex-1 rounded-xl bg-primary-fixed p-4 text-center text-sm font-medium text-primary">
                  Patient + Doctor
                </div>
                <span className="text-outline rtl:rotate-180" aria-hidden>
                  →
                </span>
                <div className="flex-1 rounded-xl bg-secondary-container p-4 text-center text-sm font-medium text-secondary">
                  Live Video
                </div>
              </div>
              <div className="font-headline text-xl text-primary">AI Engine</div>
              <div className="flex w-full items-center gap-4">
                <div className="flex-1 rounded-xl bg-tertiary-fixed p-4 text-center text-sm font-medium text-tertiary">
                  SOAP Note
                </div>
                <span className="text-outline rtl:rotate-180" aria-hidden>
                  →
                </span>
                <div className="flex-1 rounded-xl bg-primary p-4 text-center text-sm font-medium text-white">
                  EMR Entry
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
