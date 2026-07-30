import { ListSkeleton } from "@/components/platform";

export default function AdminLoading() {
  return (
    <div className="space-y-6">
      <div className="h-10 w-64 animate-pulse rounded-lg bg-surface-container-high" />
      <ListSkeleton rows={8} />
    </div>
  );
}
