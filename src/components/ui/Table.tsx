interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  className?: string;
  sortable?: boolean;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyField: keyof T;
  onRowClick?: (item: T) => void;
  emptyMessage?: string;
  sortField?: string;
  sortDir?: "asc" | "desc";
  onSort?: (field: string) => void;
}

export default function Table<T>({
  columns,
  data,
  keyField,
  onRowClick,
  emptyMessage = "No records found.",
  sortField,
  sortDir,
  onSort,
}: TableProps<T>) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-surface">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-background">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-4 py-3 text-left font-medium text-text-light ${col.className || ""} ${col.sortable ? "cursor-pointer select-none hover:text-text" : ""}`}
                onClick={col.sortable && onSort ? () => onSort(col.key) : undefined}
              >
                <span className="inline-flex items-center gap-1">
                  {col.header}
                  {col.sortable && (
                    <span className="text-xs">
                      {sortField === col.key ? (sortDir === "asc" ? "↑" : "↓") : "↕"}
                    </span>
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-8 text-center text-text-light"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((item) => (
              <tr
                key={String(item[keyField])}
                onClick={() => onRowClick?.(item)}
                className={`border-b border-border last:border-0 ${
                  onRowClick ? "cursor-pointer hover:bg-background" : ""
                }`}
              >
                {columns.map((col) => (
                  <td key={col.key} className={`px-4 py-3 ${col.className || ""}`}>
                    {col.render
                      ? col.render(item)
                      : String((item as Record<string, unknown>)[col.key] ?? "")}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
