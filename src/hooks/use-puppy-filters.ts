import { useState, useMemo, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { Puppy } from '@/lib/supabase';
import { normalizeBreedToCanonical } from '@/lib/breed-utils';
import { isPoodleOrDoodle, isSmallBreed, getSizeCategory } from '@/lib/puppy-display-utils';

export type CategoryFilter = 'all' | 'poodle-doodle' | 'small-toy';
export type SizeFilter = 'all' | 'small' | 'medium' | 'large';
export type SortOption = 'name' | 'breed' | 'price-low' | 'price-high';

export function usePuppyFilters(puppies: Puppy[] | undefined) {
  const [searchParams, setSearchParams] = useSearchParams();
  const breedFromUrl = searchParams.get('breed')?.trim() || undefined;

  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [sizeFilter, setSizeFilter] = useState<SizeFilter>('all');
  const [breedFilter, setBreedFilter] = useState<string | undefined>(breedFromUrl);
  const [sortBy, setSortBy] = useState<SortOption>('name');

  useEffect(() => {
    if (breedFromUrl) setBreedFilter(breedFromUrl);
  }, [breedFromUrl]);

  const filteredAndSorted = useMemo(() => {
    if (!puppies) return [];
    let list = [...puppies];

    if (breedFilter) {
      const b = breedFilter.toLowerCase();
      list = list.filter((p) => {
        const raw = (p.breed || '').toLowerCase();
        const canonical = normalizeBreedToCanonical(p.breed || '').toLowerCase();
        return raw.includes(b) || canonical.includes(b);
      });
    }

    if (categoryFilter === 'poodle-doodle') {
      list = list.filter((p) => isPoodleOrDoodle(p.breed || ''));
    } else if (categoryFilter === 'small-toy') {
      list = list.filter((p) => isSmallBreed(p.breed || ''));
    }

    if (sizeFilter !== 'all') {
      list = list.filter((p) => getSizeCategory(p) === sizeFilter);
    }

    list.sort((a, b) => {
      const priceA = a.final_price ?? a.base_price ?? 0;
      const priceB = b.final_price ?? b.base_price ?? 0;
      switch (sortBy) {
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
  }, [puppies, breedFilter, categoryFilter, sizeFilter, sortBy]);

  const hasActiveFilters =
    categoryFilter !== 'all' || sizeFilter !== 'all' || Boolean(breedFilter);

  const clearFilters = useCallback(() => {
    setCategoryFilter('all');
    setSizeFilter('all');
    setBreedFilter(undefined);
    setSearchParams({}, { replace: true });
  }, [setSearchParams]);

  return {
    categoryFilter,
    setCategoryFilter,
    sizeFilter,
    setSizeFilter,
    breedFilter,
    setBreedFilter,
    sortBy,
    setSortBy,
    filteredAndSorted,
    hasActiveFilters,
    clearFilters,
    setSearchParams,
  };
}
