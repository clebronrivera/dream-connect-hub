import { useState, useCallback, useEffect } from 'react';
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
  /** If set, sort key and direction are persisted to localStorage under this key (admin use) */
  storageKey?: string;
}

function compare(a: unknown, b: unknown): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b), undefined, { numeric: true });
}

function loadSortState<T>(storageKey: string, validKeys: (keyof T)[]): { key: keyof T | null; dir: 'asc' | 'desc' } {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return { key: null, dir: 'asc' };
    const parsed = JSON.parse(raw) as { sortKey?: string; sortDir?: string };
    const key = parsed.sortKey != null && validKeys.includes(parsed.sortKey as keyof T) ? (parsed.sortKey as keyof T) : null;
    const dir = parsed.sortDir === 'desc' ? 'desc' : 'asc';
    return { key, dir };
  } catch {
    return { key: null, dir: 'asc' };
  }
}

function saveSortState(storageKey: string, sortKey: string | null, sortDir: 'asc' | 'desc') {
  try {
    localStorage.setItem(storageKey, JSON.stringify({ sortKey, sortDir }));
  } catch {
    // Ignore localStorage errors (e.g. private mode)
  }
}

export function DataTable<T extends Record<string, unknown>>({ columns, data, sortable, storageKey }: DataTableProps<T>) {
  const sortableKeys = columns.map((c) => c.accessorKey).filter(Boolean) as (keyof T)[];
  const [sortKey, setSortKeyState] = useState<keyof T | null>(() =>
    storageKey ? loadSortState<T>(storageKey, sortableKeys).key : null
  );
  const [sortDir, setSortDirState] = useState<'asc' | 'desc'>(() =>
    storageKey ? loadSortState<T>(storageKey, sortableKeys).dir : 'asc'
  );

  useEffect(() => {
    if (storageKey && sortKey != null) {
      saveSortState(storageKey, String(sortKey), sortDir);
    }
  }, [storageKey, sortKey, sortDir]);

  const handleSort = useCallback((key: keyof T) => {
    if (sortKey !== key) {
      setSortKeyState(key);
      setSortDirState('asc');
    } else {
      setSortDirState((d) => (d === 'asc' ? 'desc' : 'asc'));
    }
  }, [sortKey]);

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
