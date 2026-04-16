import { useState, useRef, useEffect, useCallback, useId } from "react";
import { Search, X, Loader2, TrendingUp, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useProductSearch, type SearchResult } from "@/hooks/useProductSearch";
import { usePriceModeStore } from "@/stores/priceModeStore";
import { getPriceValue, priceLabel } from "@/lib/formatPrice";

const POPULAR_SEARCHES = [
  "Stylo Bic",
  "Ramette A4",
  "Classeur",
  "Post-it",
  "Cartouche encre",
  "Stabilo",
] as const;

const SUGGESTED_CATEGORIES = [
  { label: "Écrire & corriger", slug: "ecrire-corriger" },
  { label: "Papier & enveloppes", slug: "papier" },
  { label: "Classement", slug: "classement-archivage" },
  { label: "Petit matériel", slug: "petit-materiel" },
] as const;

interface SearchAutocompleteProps {
  className?: string;
  /** Auto-focus the input on mount */
  autoFocus?: boolean;
  /** Callback when the dropdown closes (e.g., to close mobile search) */
  onClose?: () => void;
}

export function SearchAutocomplete({ className = "", autoFocus = false, onClose }: SearchAutocompleteProps) {
  const navigate = (url: string) => { window.location.href = url; };
  const priceMode = usePriceModeStore((s) => s.mode);
  const listboxId = useId();
  const optionId = (idx: number) => `${listboxId}-opt-${idx}`;

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const { data: results = [], isLoading } = useProductSearch(debouncedQuery, 8);

  const showSuggestions = debouncedQuery.length < 2;

  // Debounce query
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(query.trim());
      setActiveIdx(-1);
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  // Open dropdown when results change or when focused with empty query
  useEffect(() => {
    if (debouncedQuery.length >= 2) setIsOpen(true);
  }, [results, debouncedQuery]);

  // Close on click outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setQuery("");
    setDebouncedQuery("");
    onClose?.();
  }, [onClose]);

  const navigateToProduct = (r: SearchResult) => {
    close();
    navigate(`/produit/${r.slug || r.id}`);
  };

  const navigateToSearch = () => {
    if (!query.trim()) return;
    close();
    navigate(`/catalogue?q=${encodeURIComponent(query.trim())}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    // When showing suggestions (empty/short query), keyboard nav is disabled
    if (showSuggestions) {
      if (e.key === "Escape") {
        setIsOpen(false);
        inputRef.current?.blur();
      }
      if (e.key === "Enter" && query.trim().length > 0) {
        e.preventDefault();
        navigateToSearch();
      }
      return;
    }

    const totalItems = results.length + 1; // +1 for "Voir tous les résultats"

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIdx((prev) => (prev + 1) % totalItems);
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIdx((prev) => (prev <= 0 ? totalItems - 1 : prev - 1));
        break;
      case "Enter":
        e.preventDefault();
        if (activeIdx >= 0 && activeIdx < results.length) {
          navigateToProduct(results[activeIdx]);
        } else {
          navigateToSearch();
        }
        break;
      case "Escape":
        setIsOpen(false);
        inputRef.current?.blur();
        break;
    }
  };

  const activeDescendant = isOpen && activeIdx >= 0 ? optionId(activeIdx) : undefined;

  return (
    <div className={`relative ${className}`}>
      <div
        className="relative"
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-owns={listboxId}
      >
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" aria-hidden="true" />
        <Input
          ref={inputRef}
          type="text"
          placeholder="Rechercher par nom, EAN, marque..."
          className="pl-10 pr-8 bg-muted/50 border-transparent focus:border-primary/30 focus:bg-background transition-all"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsOpen(true)}
          autoFocus={autoFocus}
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-activedescendant={activeDescendant}
          aria-label="Rechercher un produit"
        />
        {query && (
          <button
            type="button"
            aria-label="Effacer la recherche"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            onClick={() => { setQuery(""); setDebouncedQuery(""); setIsOpen(false); }}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div
          ref={dropdownRef}
          id={listboxId}
          role="listbox"
          aria-label="Suggestions de recherche"
          className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-xl shadow-lg z-50 overflow-hidden max-h-[460px] overflow-y-auto"
        >
          {/* Empty state with suggestions (query too short) */}
          {showSuggestions && (
            <div className="p-3 space-y-3">
              <div>
                <p className="flex items-center gap-1.5 text-[0.7rem] font-semibold uppercase tracking-widest text-muted-foreground px-2 mb-2">
                  <TrendingUp className="w-3 h-3" /> Recherches populaires
                </p>
                <div className="flex flex-wrap gap-1.5 px-1">
                  {POPULAR_SEARCHES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      className="inline-flex items-center rounded-full border border-border bg-background px-2.5 py-1 text-xs hover:border-primary hover:text-primary transition-colors"
                      onClick={() => {
                        setQuery(s);
                        setDebouncedQuery(s);
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div className="border-t border-border pt-3">
                <p className="flex items-center gap-1.5 text-[0.7rem] font-semibold uppercase tracking-widest text-muted-foreground px-2 mb-2">
                  <Sparkles className="w-3 h-3" /> Parcourir par catégorie
                </p>
                <div className="grid grid-cols-2 gap-1">
                  {SUGGESTED_CATEGORIES.map((c) => (
                    <a
                      key={c.slug}
                      href={`/catalogue?category=${c.slug}`}
                      className="rounded-md px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
                      onClick={close}
                    >
                      {c.label}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          )}

          {!showSuggestions && isLoading && (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" aria-label="Chargement" />
            </div>
          )}

          {!showSuggestions && !isLoading && results.length === 0 && (
            <div className="p-5 text-center">
              <p className="text-sm text-muted-foreground mb-3">
                Aucun produit pour « {debouncedQuery} »
              </p>
              <p className="text-xs text-muted-foreground mb-3">
                Essayez un terme plus général ou explorez :
              </p>
              <div className="flex flex-wrap gap-1.5 justify-center">
                {POPULAR_SEARCHES.slice(0, 4).map((s) => (
                  <button
                    key={s}
                    type="button"
                    className="inline-flex items-center rounded-full border border-border bg-background px-2.5 py-1 text-xs hover:border-primary hover:text-primary transition-colors"
                    onClick={() => {
                      setQuery(s);
                      setDebouncedQuery(s);
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!showSuggestions && !isLoading && results.length > 0 && (
            <>
              {results.map((r, idx) => {
                const price = getPriceValue(r.price_ht, r.price_ttc, priceMode);
                return (
                  <button
                    key={r.id}
                    id={optionId(idx)}
                    role="option"
                    aria-selected={activeIdx === idx}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/50 transition-colors ${
                      activeIdx === idx ? "bg-muted/50" : ""
                    }`}
                    onClick={() => navigateToProduct(r)}
                    onMouseEnter={() => setActiveIdx(idx)}
                  >
                    <div className="w-10 h-10 rounded-md overflow-hidden bg-muted shrink-0">
                      {r.image_url ? (
                        <img
                          src={r.image_url}
                          alt=""
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[10px] text-muted-foreground">
                          —
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{r.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {r.category}
                        {r.brand && r.brand !== "N.C" ? ` · ${r.brand}` : ""}
                      </p>
                    </div>
                    <span className="text-sm font-bold text-primary shrink-0">
                      {price.toFixed(2)}€
                      <span className="text-[10px] font-normal text-muted-foreground ml-0.5">
                        {priceLabel(priceMode)}
                      </span>
                    </span>
                  </button>
                );
              })}

              {/* "See all results" link */}
              <button
                id={optionId(results.length)}
                role="option"
                aria-selected={activeIdx === results.length}
                className={`w-full text-center text-sm font-medium text-primary py-3 border-t border-border hover:bg-muted/30 transition-colors ${
                  activeIdx === results.length ? "bg-muted/30" : ""
                }`}
                onClick={navigateToSearch}
                onMouseEnter={() => setActiveIdx(results.length)}
              >
                Voir tous les résultats pour « {debouncedQuery} »
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
