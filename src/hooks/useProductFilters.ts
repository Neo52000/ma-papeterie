import { useState, useMemo } from 'react';

export interface Product {
  id: number;
  name: string;
  category: string;
  price: string;
  originalPrice?: string | null;
  image: string;
  badge?: string | null;
  eco: boolean;
  stock?: number;
}

export interface FilterState {
  search: string;
  category: string;
  priceRange: string;
  sortBy: string;
  showEcoOnly: boolean;
}

export function useProductFilters(products: Product[]) {
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    category: 'all',
    priceRange: 'all',
    sortBy: 'name',
    showEcoOnly: false
  });

  const filteredProducts = useMemo(() => {
    let filtered = [...products];

    // Search filter
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(product => 
        product.name.toLowerCase().includes(searchTerm) ||
        product.category.toLowerCase().includes(searchTerm)
      );
    }

    // Category filter
    if (filters.category !== 'all') {
      filtered = filtered.filter(product => 
        product.category.toLowerCase() === filters.category.toLowerCase()
      );
    }

    // Price range filter
    if (filters.priceRange !== 'all') {
      filtered = filtered.filter(product => {
        const price = parseFloat(product.price);
        switch (filters.priceRange) {
          case '0-5':
            return price >= 0 && price <= 5;
          case '5-10':
            return price > 5 && price <= 10;
          case '10-20':
            return price > 10 && price <= 20;
          case '20+':
            return price > 20;
          default:
            return true;
        }
      });
    }

    // Eco filter
    if (filters.showEcoOnly) {
      filtered = filtered.filter(product => product.eco);
    }

    // Sorting
    filtered.sort((a, b) => {
      switch (filters.sortBy) {
        case 'price-asc':
          return parseFloat(a.price) - parseFloat(b.price);
        case 'price-desc':
          return parseFloat(b.price) - parseFloat(a.price);
        case 'name':
        default:
          return a.name.localeCompare(b.name);
      }
    });

    return filtered;
  }, [products, filters]);

  const updateFilter = (key: keyof FilterState, value: string | boolean) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      category: 'all',
      priceRange: 'all',
      sortBy: 'name',
      showEcoOnly: false
    });
  };

  return {
    filters,
    filteredProducts,
    updateFilter,
    clearFilters,
    resultCount: filteredProducts.length,
    totalCount: products.length
  };
}