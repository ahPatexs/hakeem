"use client";

import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Pagination({
  page,
  totalPages,
  basePath,
  searchParams,
  className,
}: {
  page: number;
  totalPages: number;
  basePath: string;
  searchParams?: Record<string, string | undefined>;
  className?: string;
}) {
  if (totalPages <= 1) return null;

  function hrefFor(p: number) {
    const params = new URLSearchParams();
    if (searchParams) {
      for (const [k, v] of Object.entries(searchParams)) {
        if (v) params.set(k, v);
      }
    }
    params.set("page", String(p));
    const q = params.toString();
    return q ? `${basePath}?${q}` : basePath;
  }

  return (
    <nav className={cn("flex items-center justify-center gap-2", className)} aria-label="Pagination">
      <Button asChild variant="outline" size="sm" disabled={page <= 1}>
        <Link href={hrefFor(Math.max(1, page - 1))}>Previous</Link>
      </Button>
      <span className="text-sm text-on-surface-variant">
        Page {page} of {totalPages}
      </span>
      <Button asChild variant="outline" size="sm" disabled={page >= totalPages}>
        <Link href={hrefFor(Math.min(totalPages, page + 1))}>Next</Link>
      </Button>
    </nav>
  );
}
