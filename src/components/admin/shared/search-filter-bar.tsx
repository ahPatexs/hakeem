"use client";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function SearchFilterBar({
  defaultQuery,
  placeholder,
  className,
}: {
  defaultQuery?: string;
  placeholder?: string;
  className?: string;
}) {
  return (
    <form method="get" className={cn("flex gap-2", className)}>
      <Input
        name="q"
        defaultValue={defaultQuery}
        placeholder={placeholder ?? "Search…"}
        className="max-w-md"
      />
      <button
        type="submit"
        className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-on-primary"
      >
        Search
      </button>
    </form>
  );
}
