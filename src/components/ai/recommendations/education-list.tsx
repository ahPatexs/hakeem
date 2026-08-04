import { getTranslations } from "next-intl/server";
import type { EducationItemDto } from "@/lib/ai/recommendations";

export async function EducationList({
  items,
}: {
  items: EducationItemDto[];
}) {
  const t = await getTranslations("ai.education");

  if (items.length === 0) {
    return (
      <section className="space-y-3" data-ai-education-list>
        <h2 className="font-headline text-lg text-primary">{t("title")}</h2>
        <p className="text-sm text-on-surface-variant">{t("empty")}</p>
      </section>
    );
  }

  return (
    <section className="space-y-3" data-ai-education-list>
      <div>
        <h2 className="font-headline text-lg text-primary">{t("title")}</h2>
        <p className="text-sm text-on-surface-variant">{t("subtitle")}</p>
      </div>
      <ul className="space-y-2">
        {items.map((item) => (
          <li
            key={item.id}
            className="rounded-xl border border-outline-variant/20 bg-surface px-4 py-3"
            data-ai-education-kind={item.kind}
          >
            <h3 className="text-sm font-medium text-primary">{item.title}</h3>
            <p className="mt-1 text-sm text-on-surface-variant">{item.body}</p>
            <p className="mt-1 text-[10px] uppercase tracking-wide text-on-surface-variant/70">
              {item.kind}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
