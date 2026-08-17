import { ChevronLeft } from "lucide-react";
import { Link } from "@/i18n/routing";

export function DetailBackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-med-green hover:underline"
    >
      <ChevronLeft className="h-4 w-4" aria-hidden />
      {label}
    </Link>
  );
}
