import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Loader2, X, Package } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

export interface ProductMatch {
  id: string;
  name: string;
  sku_interne: string | null;
  ean: string | null;
  cost_price?: number | null;
}

interface Props {
  value: ProductMatch | null;
  onChange: (product: ProductMatch | null) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export function ProductAutocomplete({ value, onChange, placeholder = 'Rechercher par nom, SKU ou EAN…', autoFocus }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ProductMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debouncedQuery = useDebounce(query, 250);

  // Search
  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    supabase
      .from('products')
      .select('id, name, sku_interne, ean, cost_price')
      .or(`name.ilike.%${debouncedQuery}%,sku_interne.ilike.%${debouncedQuery}%,ean.ilike.%${debouncedQuery}%`)
      .limit(10)
      .then(({ data }) => {
        if (cancelled) return;
        setResults((data || []) as ProductMatch[]);
        setOpen(true);
        setHighlighted(0);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [debouncedQuery]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const select = useCallback((p: ProductMatch) => {
    onChange(p);
    setQuery('');
    setResults([]);
    setOpen(false);
  }, [onChange]);

  const clear = useCallback(() => {
    onChange(null);
    setQuery('');
    setResults([]);
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [onChange]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || results.length === 0) return;
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlighted((h) => Math.min(h + 1, results.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlighted((h) => Math.max(h - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (results[highlighted]) select(results[highlighted]);
        break;
      case 'Escape':
        setOpen(false);
        break;
    }
  };

  // Scroll highlighted item into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${highlighted}"]`) as HTMLElement | null;
    el?.scrollIntoView({ block: 'nearest' });
  }, [highlighted]);

  if (value) {
    return (
      <div className="flex items-center gap-2 px-2 py-1.5 bg-muted/50 border rounded-md min-w-0">
        <Package className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{value.name}</p>
          <p className="text-xs text-muted-foreground">
            {value.sku_interne && <span className="mr-2">SKU: {value.sku_interne}</span>}
            {value.ean && <span>EAN: {value.ean}</span>}
          </p>
        </div>
        <button
          type="button"
          onClick={clear}
          className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
          title="Changer de produit"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <div className={cn(
        'flex items-center gap-1.5 border rounded-md px-2 py-1 transition-colors',
        open && results.length > 0 ? 'border-primary ring-1 ring-primary/30' : 'border-input',
      )}>
        {loading
          ? <Loader2 className="h-3.5 w-3.5 text-muted-foreground shrink-0 animate-spin" />
          : <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        }
        <input
          ref={inputRef}
          autoFocus={autoFocus}
          className="text-sm bg-transparent outline-none w-full placeholder:text-muted-foreground"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (results.length > 0) setOpen(true); }}
        />
        {query && (
          <button type="button" onClick={() => { setQuery(''); setResults([]); setOpen(false); }}>
            <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
          </button>
        )}
      </div>

      {open && results.length > 0 && (
        <div
          ref={listRef}
          className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-lg max-h-64 overflow-y-auto"
        >
          {results.map((p, i) => (
            <button
              key={p.id}
              data-idx={i}
              type="button"
              className={cn(
                'w-full text-left px-3 py-2.5 text-sm transition-colors border-b border-border/50 last:border-0',
                i === highlighted ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50',
              )}
              onMouseEnter={() => setHighlighted(i)}
              onClick={() => select(p)}
            >
              <p className="font-medium leading-tight truncate">{p.name}</p>
              <div className="flex gap-3 mt-0.5">
                {p.sku_interne && (
                  <span className="text-xs text-muted-foreground">SKU: {p.sku_interne}</span>
                )}
                {p.ean && (
                  <span className="text-xs text-muted-foreground">EAN: {p.ean}</span>
                )}
                {p.cost_price != null && (
                  <span className="text-xs text-muted-foreground ml-auto">PA: {p.cost_price.toFixed(2)} €</span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {open && query.length >= 2 && !loading && results.length === 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-lg px-3 py-3 text-sm text-muted-foreground">
          Aucun produit trouvé pour « {query} »
        </div>
      )}
    </div>
  );
}
