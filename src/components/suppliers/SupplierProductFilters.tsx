import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, X, FilterX } from 'lucide-react';

interface SupplierProductFiltersProps {
  searchFilter: string;
  onSearchChange: (value: string) => void;
  statusFilter: 'all' | 'active' | 'inactive';
  onStatusChange: (value: 'all' | 'active' | 'inactive') => void;
  stockFilter: 'all' | 'in_stock' | 'out_of_stock';
  onStockChange: (value: 'all' | 'in_stock' | 'out_of_stock') => void;
  categoryFilter: string;
  onCategoryChange: (value: string) => void;
  brandFilter: string;
  onBrandChange: (value: string) => void;
  categories: string[];
  brands: string[];
  showStatusFilter: boolean;
  hasActiveFilters: boolean;
  onResetFilters: () => void;
  filteredCount: number;
  totalCount: number;
}

export function SupplierProductFilters({
  searchFilter,
  onSearchChange,
  statusFilter,
  onStatusChange,
  stockFilter,
  onStockChange,
  categoryFilter,
  onCategoryChange,
  brandFilter,
  onBrandChange,
  categories,
  brands,
  showStatusFilter,
  hasActiveFilters,
  onResetFilters,
  filteredCount,
  totalCount,
}: SupplierProductFiltersProps) {
  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom, EAN, réf. fournisseur, SKU..."
            value={searchFilter}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 pr-9 h-9"
          />
          {searchFilter && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {showStatusFilter && (
          <Select value={statusFilter} onValueChange={(v) => onStatusChange(v as 'all' | 'active' | 'inactive')}>
            <SelectTrigger className="w-[140px] h-9">
              <SelectValue placeholder="Tous statuts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous statuts</SelectItem>
              <SelectItem value="active">Actif</SelectItem>
              <SelectItem value="inactive">Inactif</SelectItem>
            </SelectContent>
          </Select>
        )}

        <Select value={stockFilter} onValueChange={(v) => onStockChange(v as 'all' | 'in_stock' | 'out_of_stock')}>
          <SelectTrigger className="w-[140px] h-9">
            <SelectValue placeholder="Tout stock" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tout stock</SelectItem>
            <SelectItem value="in_stock">En stock</SelectItem>
            <SelectItem value="out_of_stock">Rupture</SelectItem>
          </SelectContent>
        </Select>

        {categories.length > 1 && (
          <Select value={categoryFilter} onValueChange={onCategoryChange}>
            <SelectTrigger className="w-[170px] h-9">
              <SelectValue placeholder="Toutes catégories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes catégories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {brands.length > 1 && (
          <Select value={brandFilter} onValueChange={onBrandChange}>
            <SelectTrigger className="w-[160px] h-9">
              <SelectValue placeholder="Toutes marques" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes marques</SelectItem>
              {brands.map((b) => (
                <SelectItem key={b} value={b}>{b}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={onResetFilters} className="h-9 gap-1 text-muted-foreground">
            <FilterX className="h-4 w-4" />
            Réinitialiser
          </Button>
        )}
      </div>

      {hasActiveFilters && (
        <p className="text-xs text-muted-foreground">
          {filteredCount} résultat{filteredCount !== 1 ? 's' : ''}
          {' '}sur {totalCount} articles
        </p>
      )}
    </>
  );
}
