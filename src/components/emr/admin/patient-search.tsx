"use client";

import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { emrAdminSearchPatients } from "@/actions/emr/admin";

type Hit = { id: string; name: string | null; email: string };

export function AdminEmrPatientSearch() {
  const t = useTranslations("emr");
  const router = useRouter();
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-3 rounded-xl border border-outline-variant/20 bg-surface-container-low p-4">
      <h2 className="font-headline text-lg text-primary">{t("admin.searchTitle")}</h2>
      <div className="flex flex-wrap gap-2">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("admin.searchPlaceholder")}
          className="max-w-md"
        />
        <Button
          type="button"
          variant="soft"
          disabled={pending || q.trim().length < 2}
          onClick={() => {
            setError(null);
            startTransition(async () => {
              const result = await emrAdminSearchPatients({ q: q.trim(), page: 1 });
              if (!result.ok) {
                setError(t("error"));
                setHits([]);
                return;
              }
              setHits(result.data.items);
            });
          }}
        >
          {t("admin.search")}
        </Button>
      </div>
      {error ? (
        <p className="text-sm text-warm-coral" role="alert">
          {error}
        </p>
      ) : null}
      <ul className="divide-y divide-outline-variant/15">
        {hits.map((hit) => (
          <li key={hit.id} className="flex items-center justify-between gap-3 py-2">
            <div>
              <p className="text-sm font-medium text-primary">{hit.name ?? hit.email}</p>
              <p className="text-xs text-on-surface-variant">{hit.email}</p>
            </div>
            <Button
              type="button"
              variant="soft"
              onClick={() => router.push(`/admin/emr?patientUserId=${hit.id}`)}
            >
              {t("admin.openChart")}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
