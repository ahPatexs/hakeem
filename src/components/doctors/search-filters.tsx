"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter, usePathname } from "@/i18n/routing";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type SpecialtyOption = { slug: string; name: string };

function buildHref(pathname: string, nextQ: string, nextSpecialties: string[]) {
  const params = new URLSearchParams();
  const trimmed = nextQ.trim();
  if (trimmed) params.set("q", trimmed);
  for (const slug of nextSpecialties) {
    params.append("specialty", slug);
  }
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function SearchFilters({
  specialties = [],
  initialQ = "",
  initialSpecialties = [],
  labels,
}: {
  specialties?: SpecialtyOption[];
  initialQ?: string;
  initialSpecialties?: string[];
  labels: {
    title: string;
    searchPlaceholder: string;
    searchAria: string;
    specialty: string;
    clearAll: string;
  };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [q, setQ] = useState(initialQ);
  const [, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const specialtyKey = initialSpecialties.join(",");

  useEffect(() => {
    setQ(initialQ);
  }, [initialQ]);

  useEffect(() => {
    if (q === initialQ) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      startTransition(() => {
        router.replace(buildHref(pathname, q, specialtyKey ? specialtyKey.split(",") : []));
      });
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [q, initialQ, specialtyKey, pathname, router]);

  function replaceFilters(nextQ: string, nextSpecialties: string[]) {
    startTransition(() => {
      router.replace(buildHref(pathname, nextQ, nextSpecialties));
    });
  }

  function toggleSpecialty(slug: string) {
    const next = initialSpecialties.includes(slug)
      ? initialSpecialties.filter((s) => s !== slug)
      : [...initialSpecialties, slug];
    replaceFilters(q, next);
  }

  function clearAll() {
    setQ("");
    replaceFilters("", []);
  }

  return (
    <aside className="glass-card space-y-4 rounded-2xl p-6">
      <h3 className="font-headline text-primary">{labels.title}</h3>
      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={labels.searchPlaceholder}
        aria-label={labels.searchAria}
      />
      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold text-primary">{labels.specialty}</legend>
        {specialties.map((s) => (
          <label key={s.slug} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="specialty"
              value={s.slug}
              checked={initialSpecialties.includes(s.slug)}
              onChange={() => toggleSpecialty(s.slug)}
            />
            {s.name}
          </label>
        ))}
      </fieldset>
      <Button type="button" variant="outline" className="w-full" onClick={clearAll}>
        {labels.clearAll}
      </Button>
    </aside>
  );
}
