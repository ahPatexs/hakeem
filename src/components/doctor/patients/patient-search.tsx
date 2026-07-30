"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { Search } from "lucide-react";
import { searchPatients } from "@/actions/doctor/patients";

type SearchHit = {
  id: string;
  name: string | null;
  email: string;
};

export function PatientSearch() {
  const t = useTranslations("doctor.patients");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchHit[]>([]);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    const handle = window.setTimeout(() => {
      startTransition(async () => {
        const res = await searchPatients({ query, page: 1 });
        if (res.ok) {
          setResults(res.data.items);
          setOpen(true);
        }
      });
    }, 250);
    return () => window.clearTimeout(handle);
  }, [query]);

  return (
    <div ref={containerRef} className="relative hidden max-w-xs flex-1 sm:block lg:max-w-sm">
      <label htmlFor="doctor-patient-search" className="sr-only">
        {t("search")}
      </label>
      <Search
        className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant"
        aria-hidden
      />
      <input
        id="doctor-patient-search"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => {
          if (results.length > 0) setOpen(true);
        }}
        placeholder={t("searchPlaceholder")}
        autoComplete="off"
        className="h-9 w-full rounded-full border border-outline-variant/30 bg-surface-container-low ps-9 pe-3 text-sm outline-none focus:border-primary"
      />
      {open && query.trim().length >= 2 ? (
        <ul
          role="listbox"
          className="absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-2xl border border-outline-variant/20 bg-surface-container-low py-1 shadow-lg"
        >
          {pending ? (
            <li className="px-4 py-2 text-sm text-on-surface-variant">{t("search")}…</li>
          ) : results.length === 0 ? (
            <li className="px-4 py-2 text-sm text-on-surface-variant">{t("emptyTitle")}</li>
          ) : (
            results.map((hit) => (
              <li key={hit.id} role="option">
                <Link
                  href={`/doctor/patients/${hit.id}`}
                  onClick={() => {
                    setOpen(false);
                    setQuery("");
                  }}
                  className="block px-4 py-2 text-sm hover:bg-surface-container-high"
                >
                  <span className="font-medium text-primary">{hit.name ?? hit.email}</span>
                  {hit.name ? (
                    <span className="mt-0.5 block truncate text-xs text-on-surface-variant">{hit.email}</span>
                  ) : null}
                </Link>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
