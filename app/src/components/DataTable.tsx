export function DataTable<T>({
  columns,
  rows,
  rowKey,
  emptyMessage = "Nenhum registro encontrado.",
}: {
  columns: Array<{ header: string; cell: (row: T) => React.ReactNode }>;
  rows: T[];
  rowKey: (row: T) => string;
  emptyMessage?: string;
}) {
  return (
    <div className="bg-white rounded-ps shadow-ps-sm border border-ps-navy/5 overflow-hidden overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-ps-bg-2 text-ps-muted text-xs uppercase tracking-wide">
          <tr>
            {columns.map((c) => (
              <th key={c.header} className="text-left px-4 py-3 whitespace-nowrap">
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)} className="border-t border-ps-navy/5">
              {columns.map((c) => (
                <td key={c.header} className="px-4 py-3 whitespace-nowrap">
                  {c.cell(row)}
                </td>
              ))}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-ps-muted">
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
