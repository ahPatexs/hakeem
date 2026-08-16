import { cn } from "@/lib/utils";

export function PersonAvatar({
  name,
  photoUrl,
  size = "md",
  className,
}: {
  name: string;
  photoUrl?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const dim =
    size === "lg" ? "h-14 w-14 text-lg" : size === "sm" ? "h-9 w-9 text-xs" : "h-11 w-11 text-sm";
  const initial = (name.trim().charAt(0) || "?").toUpperCase();

  if (photoUrl) {
    return (
      <span
        className={cn("relative inline-block shrink-0 overflow-hidden rounded-full bg-primary/10", dim, className)}
      >
        {/* Local doctor photos and remote URLs both work without next/image config. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photoUrl} alt="" className="h-full w-full object-cover" />
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary",
        dim,
        className,
      )}
    >
      {initial}
    </span>
  );
}
