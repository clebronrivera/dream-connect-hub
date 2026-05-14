import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { useAdminBreedPerformance } from '@/hooks/use-admin-breed-performance';
import type { BreedPerfRow } from '@/lib/admin/insights-service';
import { formatUsd, formatPercent } from '@/lib/format/currency';

type SortKey = 'breed' | 'available_count' | 'reserved_count' | 'sold_count' | 'inquiry_count' | 'avg_sale_price' | 'total_revenue_collected' | 'conversion_rate';

function getSortValue(row: BreedPerfRow, key: SortKey): number | string {
  const v = row[key];
  if (v == null) return key === 'breed' ? '' : -1;
  return v as number | string;
}

interface SortHeaderProps {
  k: SortKey;
  currentKey: SortKey;
  dir: 'asc' | 'desc';
  onToggle: (k: SortKey) => void;
  align?: 'right' | 'left';
  children: React.ReactNode;
}

function SortHeader({ k, currentKey, dir, onToggle, align, children }: SortHeaderProps) {
  const isActive = currentKey === k;
  return (
    <TableHead className={align === 'right' ? 'text-right' : ''}>
      <button
        type="button"
        onClick={() => onToggle(k)}
        className="inline-flex items-center gap-1 hover:text-foreground"
      >
        {children}
        {isActive ? (dir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />) : null}
      </button>
    </TableHead>
  );
}

export function BreedPerformanceTable() {
  const { data, isLoading, error } = useAdminBreedPerformance();
  const [sortKey, setSortKey] = useState<SortKey>('total_revenue_collected');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const sortedRows = useMemo(() => {
    const rows = [...(data ?? [])];
    rows.sort((a, b) => {
      const av = getSortValue(a, sortKey);
      const bv = getSortValue(b, sortKey);
      if (typeof av === 'string' && typeof bv === 'string') {
        return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      const an = Number(av);
      const bn = Number(bv);
      return sortDir === 'asc' ? an - bn : bn - an;
    });
    return rows;
  }, [data, sortKey, sortDir]);

  function toggleSort(k: SortKey) {
    if (k === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(k);
      setSortDir(k === 'breed' ? 'asc' : 'desc');
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Breed performance</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <p className="text-sm text-destructive py-4">Could not load breed performance.</p>
        ) : sortedRows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">No puppy data yet.</p>
        ) : (
          <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
            <Table>
              <TableHeader>
                <TableRow>
                  <SortHeader k="breed" currentKey={sortKey} dir={sortDir} onToggle={toggleSort}>Breed</SortHeader>
                  <SortHeader k="available_count" currentKey={sortKey} dir={sortDir} onToggle={toggleSort} align="right">Listed</SortHeader>
                  <SortHeader k="reserved_count" currentKey={sortKey} dir={sortDir} onToggle={toggleSort} align="right">Reserved</SortHeader>
                  <SortHeader k="sold_count" currentKey={sortKey} dir={sortDir} onToggle={toggleSort} align="right">Sold</SortHeader>
                  <SortHeader k="inquiry_count" currentKey={sortKey} dir={sortDir} onToggle={toggleSort} align="right">Inquiries</SortHeader>
                  <SortHeader k="avg_sale_price" currentKey={sortKey} dir={sortDir} onToggle={toggleSort} align="right">Avg sale</SortHeader>
                  <SortHeader k="total_revenue_collected" currentKey={sortKey} dir={sortDir} onToggle={toggleSort} align="right">Revenue</SortHeader>
                  <SortHeader k="conversion_rate" currentKey={sortKey} dir={sortDir} onToggle={toggleSort} align="right">Conversion</SortHeader>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedRows.map((r) => (
                  <TableRow key={r.breed}>
                    <TableCell className="font-medium">{r.breed}</TableCell>
                    <TableCell className="text-right">{r.available_count}</TableCell>
                    <TableCell className="text-right">{r.reserved_count}</TableCell>
                    <TableCell className="text-right">{r.sold_count}</TableCell>
                    <TableCell className="text-right">{r.inquiry_count}</TableCell>
                    <TableCell className="text-right">{r.avg_sale_price != null ? formatUsd(r.avg_sale_price) : '—'}</TableCell>
                    <TableCell className="text-right">{formatUsd(r.total_revenue_collected)}</TableCell>
                    <TableCell className="text-right">{r.conversion_rate != null ? formatPercent(r.conversion_rate, 1) : '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
