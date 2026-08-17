"use client";

import { Search } from "lucide-react";
import { usePathname, useRouter } from "@/i18n/routing";
import { Input } from "@/components/ui/input";
import { portalCardClass } from "@/components/portal/chrome";

export function CareHubSearch({
  defaultValue = "",
  placeholder,
  preserve = {},
}: {
  defaultValue?: string;
  placeholder: string;
  /** Query params to keep when submitting search (e.g. tab, bucket). */
  preserve?: Record<string, string | undefined>;
}) {
  const router = useRouter();
  const pathname = usePathname();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const q = String(data.get("q") ?? "").trim();
    const params = new URLSearchParams(
      typeof window !== "undefined" ? window.location.search : "",
    );
    params.delete("page");
    if (q) params.set("q", q);
    else params.delete("q");
    for (const [key, value] of Object.entries(preserve)) {
      if (value) params.set(key, value);
    }
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <form
      onSubmit={onSubmit}
      className={`${portalCardClass} flex items-center gap-2 px-4 py-3`}
      role="search"
    >
      <Search className="h-4 w-4 shrink-0 text-on-surface-variant" aria-hidden />
      <Input
        name="q"
        type="search"
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="h-10 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
        aria-label={placeholder}
      />
    </form>
  );
}
