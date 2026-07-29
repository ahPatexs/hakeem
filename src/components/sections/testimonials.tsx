import type { Testimonial } from "@/content/types";

export function Testimonials({ items, title }: { items: Testimonial[]; title?: string }) {
  if (!items.length) return null;
  return (
    <section className="mx-auto max-w-7xl px-margin-mobile py-2xl md:px-margin-desktop">
      {title ? <h2 className="mb-8 font-headline text-headline-lg text-primary">{title}</h2> : null}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <blockquote
            key={item.id}
            className="glass-card rounded-2xl p-6 text-on-surface-variant shadow-sm"
          >
            <p className="mb-4 text-base leading-relaxed text-on-surface">&ldquo;{item.quote}&rdquo;</p>
            <footer>
              <cite className="not-italic font-semibold text-primary">{item.authorName}</cite>
              {item.context ? (
                <p className="text-sm text-on-surface-variant">{item.context}</p>
              ) : null}
            </footer>
          </blockquote>
        ))}
      </div>
    </section>
  );
}
