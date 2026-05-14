import { useState, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { Puppy } from '@/lib/supabase';
import { normalizeBreedToCanonical } from '@/lib/breed-utils';

export type SortOption =
  | 'ready-soonest'
  | 'name'
  | 'breed'
  | 'price-low'
  | 'price-high';

export function usePuppyFilters(puppies: Puppy[] | undefined) {
  const [searchParams, setSearchParams] = useSearchParams();
  const breedFromUrl = searchParams.get('breed')?.trim() || undefined;

  const [breedFilter, setBreedFilter] = useState<string | undefined>(breedFromUrl);
  const [sortBy, setSortBy] = useState<SortOption>('ready-soonest');

  // Sync breedFilter to the URL's ?breed= param when it changes (adjust state during render)
  const [prevBreedFromUrl, setPrevBreedFromUrl] = useState(breedFromUrl);
  if (breedFromUrl !== prevBreedFromUrl) {
    setPrevBreedFromUrl(breedFromUrl);
    if (breedFromUrl) setBreedFilter(breedFromUrl);
  }

  const filteredAndSorted = useMemo(() => {
    if (!puppies) return [];
    let list = [...puppies];

    if (breedFilter) {
      const target = normalizeBreedToCanonical(breedFilter).toLowerCase();
      list = list.filter((p) => {
        const canonical = normalizeBreedToCanonical(p.breed || '').toLowerCase();
        return canonical === target;
      });
    }

    list.sort((a, b) => {
      const priceA = a.final_price ?? a.base_price ?? 0;
      const priceB = b.final_price ?? b.base_price ?? 0;
      switch (sortBy) {
        case 'ready-soonest': {
          // Ascending ready_date with null last; secondary sort: newer listing first.
          const ra = a.ready_date ? Date.parse(a.ready_date) : Number.POSITIVE_INFINITY;
          const rb = b.ready_date ? Date.parse(b.ready_date) : Number.POSITIVE_INFINITY;
          if (ra !== rb) return ra - rb;
          const la = a.listing_date ? Date.parse(a.listing_date) : 0;
          const lb = b.listing_date ? Date.parse(b.listing_date) : 0;
          return lb - la;
        }
        case 'name':
          return (a.name || '').localeCompare(b.name || '');
        case 'breed':
          return (a.breed || '').localeCompare(b.breed || '');
        case 'price-low':
          return Number(priceA) - Number(priceB);
        case 'price-high':
          return Number(priceB) - Number(priceA);
        default:
          return 0;
      }
    });

    return list;
  }, [puppies, breedFilter, sortBy]);

  const hasActiveFilters = Boolean(breedFilter);

  const clearFilters = useCallback(() => {
    setBreedFilter(undefined);
    setSearchParams({}, { replace: true });
  }, [setSearchParams]);

  /** Update the breed filter and the ?breed= URL param together. */
  const applyBreedFilter = useCallback(
    (next: string | undefined) => {
      setBreedFilter(next);
      const params = new URLSearchParams(searchParams);
      if (next) params.set('breed', next);
      else params.delete('breed');
      setSearchParams(params, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  return {
    breedFilter,
    setBreedFilter: applyBreedFilter,
    sortBy,
    setSortBy,
    filteredAndSorted,
    hasActiveFilters,
    clearFilters,
    setSearchParams,
  };
}
