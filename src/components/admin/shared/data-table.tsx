import { cn } from "@/lib/utils";

export function DataTable({
  columns,
  rows,
  emptyMessage = "No records found.",
  className,
}: {
  columns: string[];
  rows: Array<Array<React.ReactNode>>;
  emptyMessage?: string;
  className?: string;
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-on-surface-variant">{emptyMessage}</p>;
  }
  return (
    <div className={cn("overflow-x-auto rounded-xl border border-outline-variant/20", className)}>
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="bg-surface-container-high/60">
          <tr>
            {columns.map((col) => (
              <th key={col} className="px-4 py-3 font-semibold text-primary">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t border-outline-variant/10 hover:bg-surface-container-high/40">
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-3 text-on-surface-variant">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
