'use client';

import { useState, useMemo } from 'react';
import { Product } from '@/data/products';
import ProductCard from './ProductCard';
import { Search, SlidersHorizontal, X, Sparkles, Tag, ArrowUpDown } from 'lucide-react';

interface ProductCatalogFilterProps {
  initialProducts: Product[];
}

type CategoryType = 'All' | 'Heritage' | 'Traditional' | 'Modern' | 'Coastal';
type SortOption = 'featured' | 'price-asc' | 'price-desc' | 'name';

export default function ProductCatalogFilter({ initialProducts }: ProductCatalogFilterProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryType>('All');
  const [sortBy, setSortBy] = useState<SortOption>('featured');
  const [selectedSizeFilter, setSelectedSizeFilter] = useState<'all' | 'small' | 'medium' | 'large'>('all');

  const categories: CategoryType[] = ['All', 'Heritage', 'Traditional', 'Modern', 'Coastal'];

  const filteredProducts = useMemo(() => {
    return initialProducts
      .filter((product) => {
        // Search query match
        const matchesSearch =
          searchQuery.trim() === '' ||
          product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          product.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (product.material && product.material.toLowerCase().includes(searchQuery.toLowerCase()));

        // Category filter
        const matchesCategory =
          selectedCategory === 'All' || product.category === selectedCategory;

        // Size filter
        let matchesSize = true;
        if (selectedSizeFilter === 'small') {
          matchesSize = product.sizes.some((s) => s.width <= 5);
        } else if (selectedSizeFilter === 'medium') {
          matchesSize = product.sizes.some((s) => s.width >= 6 && s.width <= 8);
        } else if (selectedSizeFilter === 'large') {
          matchesSize = product.sizes.some((s) => s.width >= 9);
        }

        return matchesSearch && matchesCategory && matchesSize;
      })
      .sort((a, b) => {
        if (sortBy === 'price-asc') return a.price - b.price;
        if (sortBy === 'price-desc') return b.price - a.price;
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        return 0; // featured default
      });
  }, [initialProducts, searchQuery, selectedCategory, sortBy, selectedSizeFilter]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('All');
    setSortBy('featured');
    setSelectedSizeFilter('all');
  };

  const isFiltered =
    searchQuery.trim() !== '' ||
    selectedCategory !== 'All' ||
    sortBy !== 'featured' ||
    selectedSizeFilter !== 'all';

  return (
    <div className="space-y-8">
      {/* Search & Filter Bar */}
      <div className="bg-[var(--bg-secondary)] p-4 sm:p-5 rounded-2xl border border-[var(--border-secondary)] shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search by rug name, material (e.g. wool, jute), or collection..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-[var(--border-secondary)] bg-[var(--bg-primary)] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-gold)] transition-colors shadow-inner"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-48">
              <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)] pointer-events-none" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="w-full pl-9 pr-8 py-2.5 rounded-xl border border-[var(--border-secondary)] bg-[var(--bg-primary)] text-xs font-medium text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-gold)] cursor-pointer"
              >
                <option value="featured">Sort: Featured</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="name">Name: A to Z</option>
              </select>
            </div>

            {isFiltered && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-3 py-2.5 rounded-xl border border-[var(--border-secondary)] bg-[var(--bg-tertiary)] hover:bg-[var(--accent-terracotta)]/15 hover:text-[var(--accent-terracotta)] text-xs font-semibold text-[var(--text-secondary)] transition-colors cursor-pointer flex items-center gap-1 shrink-0"
              >
                <X className="w-3 h-3" />
                <span className="hidden sm:inline">Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Category & Dimension Filter Pills */}
        <div className="space-y-2.5 pt-3 border-t border-[var(--border-secondary)]/70">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mr-1 flex items-center gap-1">
                <Tag className="w-3 h-3 text-[var(--accent-gold)]" />
                Style:
              </span>
              {categories.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setSelectedCategory(category)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    selectedCategory === category
                      ? 'bg-[var(--brand-earth)] text-[var(--bg-primary)] shadow-sm'
                      : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-primary)]'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
              <span className="font-mono font-semibold text-[var(--accent-gold)]">{filteredProducts.length}</span>
              <span>of {initialProducts.length} rugs displayed</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-[var(--border-secondary)]/40">
            <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mr-1 flex items-center gap-1">
              <SlidersHorizontal className="w-3 h-3 text-[var(--accent-gold)]" />
              Room Size:
            </span>
            {[
              { id: 'all', label: 'All Dimensions' },
              { id: 'small', label: 'Accent / Runner (≤5 ft)' },
              { id: 'medium', label: 'Living Area (6–8 ft)' },
              { id: 'large', label: 'Grand Space (9+ ft)' },
            ].map((sizeOpt) => (
              <button
                key={sizeOpt.id}
                type="button"
                onClick={() => setSelectedSizeFilter(sizeOpt.id as any)}
                className={`px-2.5 py-0.5 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                  selectedSizeFilter === sizeOpt.id
                    ? 'bg-[var(--accent-gold)] text-[var(--bg-primary)] font-semibold shadow-xs'
                    : 'bg-[var(--bg-tertiary)]/70 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-primary)]'
                }`}
              >
                {sizeOpt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Rug Grid */}
      {filteredProducts.length > 0 ? (
        <div className="grid grid-cols-1 gap-y-8 gap-x-6 sm:grid-cols-2 lg:grid-cols-4 xl:gap-x-6">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="py-16 text-center bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-secondary)] p-8">
          <SlidersHorizontal className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-3 opacity-60" />
          <h3 className="text-base font-bold text-[var(--text-primary)] mb-1">No matching rugs found</h3>
          <p className="text-xs text-[var(--text-secondary)] max-w-sm mx-auto mb-4 leading-relaxed">
            Try searching for another keyword or reset the category filters to browse the full catalog collection.
          </p>
          <button
            type="button"
            onClick={handleResetFilters}
            className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-[var(--brand-earth)] text-[var(--bg-primary)] text-xs font-semibold hover:bg-[var(--accent-gold)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
          >
            <span>Reset All Filters</span>
          </button>
        </div>
      )}
    </div>
  );
}
