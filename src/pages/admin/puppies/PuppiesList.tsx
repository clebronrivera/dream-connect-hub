import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Puppy } from '@/lib/supabase';
import { fetchAdminPuppies, deletePuppy } from '@/lib/admin/puppies-service';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Pencil, Trash2, SlidersHorizontal, X } from 'lucide-react';
import { DataTable } from '@/components/admin/DataTable';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { getDisplayAgeWeeks } from '@/lib/puppy-utils';
import { getPuppyImage } from '@/lib/puppy-display-utils';

type PuppyWithLitter = Puppy & {
  upcoming_litter?: {
    id?: string | null;
    dam_name?: string | null;
    sire_name?: string | null;
    date_of_birth?: string | null;
    dam_photo_path?: string | null;
    sire_photo_path?: string | null;
  } | null;
};

interface Filters {
  litterId: string;
  dam: string;
  sire: string;
  litterDateFrom: string;
  litterDateTo: string;
  ageMin: string;
  ageMax: string;
}

const EMPTY_FILTERS: Filters = {
  litterId: '',
  dam: '',
  sire: '',
  litterDateFrom: '',
  litterDateTo: '',
  ageMin: '',
  ageMax: '',
};

function hasActiveFilters(f: Filters) {
  return Object.values(f).some((v) => v !== '');
}

function applyFilters(list: PuppyWithLitter[], filters: Filters): PuppyWithLitter[] {
  if (!hasActiveFilters(filters)) return list;
  return list.filter((p) => {
    const ul = p.upcoming_litter;

    if (filters.litterId && p.upcoming_litter_id !== filters.litterId) return false;
    if (filters.dam && ul?.dam_name !== filters.dam) return false;
    if (filters.sire && ul?.sire_name !== filters.sire) return false;

    const litterDob = ul?.date_of_birth ?? null;
    if (filters.litterDateFrom && litterDob && litterDob < filters.litterDateFrom) return false;
    if (filters.litterDateTo && litterDob && litterDob > filters.litterDateTo) return false;
    // if no litterDob but a litter date filter is active, exclude the puppy
    if ((filters.litterDateFrom || filters.litterDateTo) && !litterDob) return false;

    if (filters.ageMin || filters.ageMax) {
      const ageWks = getDisplayAgeWeeks(p);
      if (filters.ageMin !== '' && (ageWks == null || ageWks < Number(filters.ageMin))) return false;
      if (filters.ageMax !== '' && (ageWks == null || ageWks > Number(filters.ageMax))) return false;
    }

    return true;
  });
}

export default function PuppiesList() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const { data: puppies, isLoading } = useQuery({
    queryKey: ['admin-puppies'],
    queryFn: fetchAdminPuppies,
  });

  const allPuppies = (puppies ?? []) as PuppyWithLitter[];

  // Derive unique filter options from all loaded puppies
  const litterOptions = useMemo(() => {
    const seen = new Set<string>();
    const opts: { id: string; label: string }[] = [];
    for (const p of allPuppies) {
      if (!p.upcoming_litter_id) continue;
      if (seen.has(p.upcoming_litter_id)) continue;
      seen.add(p.upcoming_litter_id);
      const dam = p.upcoming_litter?.dam_name ?? '—';
      const sire = p.upcoming_litter?.sire_name ?? '—';
      const dob = p.upcoming_litter?.date_of_birth
        ? new Date(p.upcoming_litter.date_of_birth).toLocaleDateString()
        : '';
      opts.push({
        id: p.upcoming_litter_id,
        label: `${dam} × ${sire}${dob ? ` (${dob})` : ''}`,
      });
    }
    return opts.sort((a, b) => a.label.localeCompare(b.label));
  }, [allPuppies]);

  const damOptions = useMemo(() => {
    const names = new Set<string>();
    for (const p of allPuppies) {
      const n = p.upcoming_litter?.dam_name;
      if (n) names.add(n);
    }
    return [...names].sort();
  }, [allPuppies]);

  const sireOptions = useMemo(() => {
    const names = new Set<string>();
    for (const p of allPuppies) {
      const n = p.upcoming_litter?.sire_name;
      if (n) names.add(n);
    }
    return [...names].sort();
  }, [allPuppies]);

  const availablePuppies = useMemo(
    () =>
      allPuppies.filter(
        (p) => !!p.is_publicly_visible && !p.is_deceased && (p.status || '').toLowerCase() === 'available'
      ),
    [allPuppies]
  );
  const soldPuppies = useMemo(
    () =>
      allPuppies.filter(
        (p) => p.is_deceased || !p.is_publicly_visible || (p.status || '').toLowerCase() === 'sold'
      ),
    [allPuppies]
  );

  const filteredAvailable = useMemo(() => applyFilters(availablePuppies, filters), [availablePuppies, filters]);
  const filteredSold = useMemo(() => applyFilters(soldPuppies, filters), [soldPuppies, filters]);

  const activeCount = Object.values(filters).filter((v) => v !== '').length;

  const deleteMutation = useMutation({
    mutationFn: deletePuppy,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-puppies'] });
      toast({ title: 'Puppy deleted', description: 'The puppy has been removed successfully.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message || 'Failed to delete puppy.', variant: 'destructive' });
    },
  });

  const handleDelete = (id: string) => deleteMutation.mutate(id);

  function set(key: keyof Filters, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  const columns = [
    {
      header: 'Photo',
      cell: (puppy: Puppy) => (
        <img
          src={getPuppyImage(puppy) ?? '/placeholder.svg'}
          alt={puppy.name}
          className="h-12 w-12 rounded-full object-cover"
          onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.svg'; }}
        />
      ),
    },
    { header: 'Name', accessorKey: 'name' as keyof Puppy },
    { header: 'Breed', accessorKey: 'breed' as keyof Puppy },
    {
      header: 'Dam',
      cell: (puppy: PuppyWithLitter) => puppy.upcoming_litter?.dam_name ?? '—',
    },
    {
      header: 'Sire',
      cell: (puppy: PuppyWithLitter) => puppy.upcoming_litter?.sire_name ?? '—',
    },
    {
      header: 'Litter Date',
      cell: (puppy: PuppyWithLitter) => {
        const d = puppy.upcoming_litter?.date_of_birth;
        return d ? new Date(d).toLocaleDateString() : '—';
      },
    },
    {
      header: 'Listed',
      accessorKey: 'listing_date' as keyof Puppy,
      cell: (puppy: Puppy) => {
        const d = puppy.listing_date ?? puppy.created_at;
        return d ? new Date(d).toLocaleDateString() : '-';
      },
    },
    {
      header: 'Age (wks)',
      cell: (puppy: Puppy) => {
        const w = getDisplayAgeWeeks(puppy);
        return w != null ? w : '-';
      },
    },
    { header: 'Gender', accessorKey: 'gender' as keyof Puppy },
    { header: 'Status', accessorKey: 'status' as keyof Puppy },
    {
      header: 'Price',
      accessorKey: 'final_price' as keyof Puppy,
      cell: (puppy: Puppy) => `$${puppy.final_price || puppy.base_price || 0}`,
    },
    {
      header: 'Actions',
      cell: (puppy: Puppy) => (
        <div className="flex gap-2">
          <Link to={`/admin/puppies/${puppy.id}/edit`}>
            <Button variant="ghost" size="sm"><Pencil className="h-4 w-4" /></Button>
          </Link>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm"><Trash2 className="h-4 w-4" /></Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete {puppy.name}. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => handleDelete(puppy.id!)}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      ),
    },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Manage Puppies</h1>
        <div className="flex items-center gap-2">
          <Button
            variant={filtersOpen ? 'secondary' : 'outline'}
            onClick={() => setFiltersOpen((o) => !o)}
            className="relative"
          >
            <SlidersHorizontal className="mr-2 h-4 w-4" />
            Filters
            {activeCount > 0 && (
              <span className="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-primaryDeep text-[11px] font-semibold text-white">
                {activeCount}
              </span>
            )}
          </Button>
          <Link to="/admin/puppies/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Puppy
            </Button>
          </Link>
        </div>
      </div>

      <p className="text-sm text-muted-foreground mb-4">
        Use the <strong>Edit</strong> (pencil) button on a puppy to create a litter and add littermates.
      </p>

      {/* Filter panel */}
      {filtersOpen && (
        <div className="mb-6 rounded-lg border bg-muted/30 p-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">

            {/* Litter */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Litter</label>
              <Select value={filters.litterId} onValueChange={(v) => set('litterId', v === '_all' ? '' : v)}>
                <SelectTrigger className="h-9 bg-background">
                  <SelectValue placeholder="All litters" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">All litters</SelectItem>
                  {litterOptions.map((o) => (
                    <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Dam */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Dam (mother)</label>
              <Select value={filters.dam} onValueChange={(v) => set('dam', v === '_all' ? '' : v)}>
                <SelectTrigger className="h-9 bg-background">
                  <SelectValue placeholder="All dams" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">All dams</SelectItem>
                  {damOptions.map((n) => (
                    <SelectItem key={n} value={n}>{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Sire */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Sire (father)</label>
              <Select value={filters.sire} onValueChange={(v) => set('sire', v === '_all' ? '' : v)}>
                <SelectTrigger className="h-9 bg-background">
                  <SelectValue placeholder="All sires" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">All sires</SelectItem>
                  {sireOptions.map((n) => (
                    <SelectItem key={n} value={n}>{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Litter date — from */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Litter born from</label>
              <Input
                type="date"
                className="h-9 bg-background"
                value={filters.litterDateFrom}
                onChange={(e) => set('litterDateFrom', e.target.value)}
              />
            </div>

            {/* Litter date — to */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Litter born to</label>
              <Input
                type="date"
                className="h-9 bg-background"
                value={filters.litterDateTo}
                onChange={(e) => set('litterDateTo', e.target.value)}
              />
            </div>

            {/* Age min */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Min age (weeks)</label>
              <Input
                type="number"
                min={0}
                placeholder="e.g. 6"
                className="h-9 bg-background"
                value={filters.ageMin}
                onChange={(e) => set('ageMin', e.target.value)}
              />
            </div>

            {/* Age max */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Max age (weeks)</label>
              <Input
                type="number"
                min={0}
                placeholder="e.g. 16"
                className="h-9 bg-background"
                value={filters.ageMax}
                onChange={(e) => set('ageMax', e.target.value)}
              />
            </div>

          </div>

          {activeCount > 0 && (
            <div className="mt-3 flex items-center justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFilters(EMPTY_FILTERS)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="mr-1 h-3 w-3" />
                Clear all filters
              </Button>
            </div>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primaryDeep" />
        </div>
      ) : (
        <>
          <section className="mb-10">
            <h2 className="text-xl font-semibold mb-4">
              Available ({filteredAvailable.length}
              {activeCount > 0 && availablePuppies.length !== filteredAvailable.length
                ? ` of ${availablePuppies.length}`
                : ''})
            </h2>
            <DataTable
              columns={columns}
              data={filteredAvailable}
              sortable
              storageKey="admin-puppies-available-sort"
            />
          </section>
          <section>
            <h2 className="text-xl font-semibold mb-4">
              Sold / Hidden / Deceased ({filteredSold.length}
              {activeCount > 0 && soldPuppies.length !== filteredSold.length
                ? ` of ${soldPuppies.length}`
                : ''})
            </h2>
            <DataTable
              columns={columns}
              data={filteredSold}
              sortable
              storageKey="admin-puppies-sold-sort"
            />
          </section>
        </>
      )}
    </div>
  );
}
