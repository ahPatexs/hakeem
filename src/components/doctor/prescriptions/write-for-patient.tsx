import { Link } from "@/i18n/routing";
import { PersonAvatar } from "@/components/portal/person-avatar";
import { portalCardClass } from "@/components/portal/chrome";
import { cn } from "@/lib/utils";

export type WriteForPerson = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
};

export function WriteForPatient({
  people,
  query,
  action,
  hiddenFields,
  title,
  hint,
  searchPlaceholder,
  searchLabel,
  writeLabel,
  emptyTitle,
  emptyHint,
  patientsHref,
  patientsLabel,
  hrefFor,
}: {
  people: WriteForPerson[];
  query: string;
  action?: string;
  hiddenFields?: Record<string, string>;
  title: string;
  hint: string;
  searchPlaceholder: string;
  searchLabel: string;
  writeLabel: string;
  emptyTitle: string;
  emptyHint: string;
  patientsHref: string;
  patientsLabel: string;
  hrefFor?: (patientId: string) => string;
}) {
  return (
    <section className={cn(portalCardClass, "p-5 sm:p-6")}>
      <h2 className="font-headline text-lg text-primary">{title}</h2>
      <p className="mt-1 text-sm text-on-surface-variant">{hint}</p>
      <form method="get" action={action || undefined} className="mt-4 flex gap-2" role="search">
        {hiddenFields
          ? Object.entries(hiddenFields).map(([name, value]) => (
              <input key={name} type="hidden" name={name} value={value} />
            ))
          : null}
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder={searchPlaceholder}
          className="h-10 w-full rounded-xl border border-outline-variant/30 bg-surface-container-low px-4 text-sm outline-none focus:border-primary"
        />
        <button
          type="submit"
          className="h-10 shrink-0 rounded-xl bg-primary px-4 text-sm font-semibold text-on-primary hover:opacity-90"
        >
          {searchLabel}
        </button>
      </form>
      {people.length === 0 ? (
        <div className="mt-4 rounded-2xl bg-surface-container-low px-4 py-6 text-center">
          <p className="font-semibold text-primary">{emptyTitle}</p>
          <p className="mt-1 text-sm text-on-surface-variant">{emptyHint}</p>
          <Link href={patientsHref} className="mt-3 inline-block text-sm font-semibold text-med-green hover:underline">
            {patientsLabel}
          </Link>
        </div>
      ) : (
        <ul className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {people.map((person) => {
            const name = person.name ?? person.email;
            return (
              <li key={person.id}>
                <Link
                  href={hrefFor ? hrefFor(person.id) : `/doctor/prescriptions/new?patient=${person.id}`}
                  className="flex items-center gap-3 rounded-2xl border border-outline-variant/20 px-3 py-2.5 hover:bg-surface-container-low"
                >
                  <PersonAvatar name={name} photoUrl={person.image} size="sm" />
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-primary">{name}</span>
                  <span className="shrink-0 text-xs font-semibold text-med-green">{writeLabel}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
