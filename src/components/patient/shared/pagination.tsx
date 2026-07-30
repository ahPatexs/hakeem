"use client";

import { usePathname, useRouter } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  className?: string;
  paramName?: string;
}

export function Pagination({ page, pageSize, total, className, paramName = "page" }: PaginationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);

  if (totalPages <= 1) return null;

  function goTo(nextPage: number) {
    const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
    if (nextPage <= 1) {
      params.delete(paramName);
    } else {
      params.set(paramName, String(nextPage));
    }
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <nav
      className={cn("flex items-center justify-between gap-4 pt-4", className)}
      aria-label="Pagination"
    >
      <p className="text-sm text-on-surface-variant">
        Page {safePage} of {totalPages}
      </p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={safePage <= 1}
          onClick={() => goTo(safePage - 1)}
          type="button"
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={safePage >= totalPages}
          onClick={() => goTo(safePage + 1)}
          type="button"
        >
          Next
        </Button>
      </div>
    </nav>
  );
}
