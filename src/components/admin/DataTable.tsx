import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

interface Column<T> {
  header: string;
  accessorKey?: keyof T;
  cell?: (row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  /** Enable clickable column headers to sort by columns that have accessorKey */
  sortable?: boolean;
}

function compare(a: unknown, b: unknown): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b), undefined, { numeric: true });
}

export function DataTable<T extends Record<string, unknown>>({ columns, data, sortable }: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<keyof T | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const handleSort = (key: keyof T) => {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir('asc');
    } else {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    }
  };

  const sortedData = sortable && sortKey
    ? [...data].sort((ra, rb) => {
        const a = ra[sortKey];
        const b = rb[sortKey];
        const out = compare(a, b);
        return sortDir === 'asc' ? out : -out;
      })
    : data;

  return (
    <div
      className="relative overflow-x-auto rounded-md border bg-background"
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      {/* Subtle right-edge shadow when content overflows */}
      <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-4 bg-gradient-to-l from-border/40 to-transparent rounded-r-md z-0" aria-hidden />
      <Table className="min-w-full relative z-10">
        <TableHeader>
          <TableRow>
            {columns.map((column) => {
              const canSort = sortable && column.accessorKey != null;
              const isActive = sortKey === column.accessorKey;
              return (
                <TableHead key={column.header}>
                  {canSort ? (
                    <button
                      type="button"
                      onClick={() => handleSort(column.accessorKey!)}
                      className="flex items-center gap-1 font-medium hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring rounded"
                    >
                      {column.header}
                      {isActive ? (
                        sortDir === 'asc' ? (
                          <ArrowUp className="h-4 w-4" />
                        ) : (
                          <ArrowDown className="h-4 w-4" />
                        )
                      ) : (
                        <ArrowUpDown className="h-4 w-4 opacity-50" />
                      )}
                    </button>
                  ) : (
                    column.header
                  )}
                </TableHead>
              );
            })}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedData.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="text-center text-muted-foreground py-8">
                No data available
              </TableCell>
            </TableRow>
          ) : (
            sortedData.map((row, rowIndex) => (
              <TableRow key={rowIndex}>
                {columns.map((column) => (
                  <TableCell key={column.header}>
                    {column.cell
                      ? column.cell(row)
                      : column.accessorKey
                        ? String(row[column.accessorKey] ?? '')
                        : ''}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
