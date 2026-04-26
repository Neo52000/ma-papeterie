import { useEffect, useId, useRef, useState } from 'react';
import { Building2, CheckCircle2, Loader2, Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  useSireneLookup,
  detectSireneMode,
  type SireneResult,
} from '@/hooks/useSireneLookup';

interface SiretAutocompleteProps {
  /** Valeur contrôlée (SIRET ou nom d'entreprise). */
  value: string;
  /** Mise à jour du champ saisi (sans déclencher la sélection). */
  onChange: (value: string) => void;
  /** Appelé quand l'utilisateur choisit un résultat SIRENE dans la liste. */
  onSelect: (result: SireneResult) => void;
  /** État "vérifié INSEE" — affiche un badge à droite du champ. */
  verified?: boolean;
  /** Appelé quand le badge "vérifié" doit être retiré (édition manuelle). */
  onClearVerified?: () => void;
  placeholder?: string;
  className?: string;
  id?: string;
  disabled?: boolean;
}

export function SiretAutocomplete({
  value,
  onChange,
  onSelect,
  verified = false,
  onClearVerified,
  placeholder = 'Nom de votre entreprise ou SIRET',
  className = '',
  id,
  disabled = false,
}: SiretAutocompleteProps) {
  const listboxId = useId();
  const optionId = (idx: number) => `${listboxId}-opt-${idx}`;

  const [isOpen, setIsOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const trimmed = value.trim();
  const { data: results = [], isLoading, isError } = useSireneLookup(trimmed);

  const mode = detectSireneMode(trimmed);
  const tooShort = mode === 'autocomplete' && trimmed.length < 3;

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
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSelect = (result: SireneResult) => {
    onSelect(result);
    setIsOpen(false);
    setActiveIdx(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) {
      if (e.key === 'Escape') {
        setIsOpen(false);
        inputRef.current?.blur();
      }
      return;
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIdx((prev) => (prev + 1) % results.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIdx((prev) => (prev <= 0 ? results.length - 1 : prev - 1));
        break;
      case 'Enter':
        if (activeIdx >= 0 && activeIdx < results.length) {
          e.preventDefault();
          handleSelect(results[activeIdx]);
        }
        break;
      case 'Escape':
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
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4"
          aria-hidden="true"
        />
        <Input
          ref={inputRef}
          id={id}
          type="text"
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          onChange={(e) => {
            onChange(e.target.value);
            if (verified) onClearVerified?.();
            setActiveIdx(-1);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-activedescendant={activeDescendant}
          className={`pl-10 ${verified ? 'pr-36' : 'pr-10'}`}
        />
        {verified && (
          <Badge
            variant="secondary"
            className="absolute right-2 top-1/2 -translate-y-1/2 gap-1 bg-green-50 text-green-800 border border-green-200"
          >
            <CheckCircle2 className="w-3 h-3" />
            Vérifié INSEE
          </Badge>
        )}
        {!verified && value && (
          <button
            type="button"
            onClick={() => {
              onChange('');
              setIsOpen(false);
              inputRef.current?.focus();
            }}
            aria-label="Effacer"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {isOpen && !verified && (
        <div
          ref={dropdownRef}
          id={listboxId}
          role="listbox"
          aria-label="Suggestions d'entreprises"
          className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg z-50 overflow-hidden max-h-[380px] overflow-y-auto"
        >
          {tooShort && (
            <div className="p-4 text-sm text-muted-foreground text-center">
              Saisissez au moins 3 caractères (nom) ou un SIRET (14 chiffres).
            </div>
          )}

          {!tooShort && isLoading && (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {!tooShort && !isLoading && isError && (
            <div className="p-4 text-sm text-destructive text-center">
              Service temporairement indisponible. Vous pouvez saisir manuellement.
            </div>
          )}

          {!tooShort && !isLoading && !isError && results.length === 0 && (
            <div className="p-4 text-sm text-muted-foreground text-center">
              Aucune entreprise trouvée pour « {trimmed} ». Vous pouvez continuer
              en saisie manuelle.
            </div>
          )}

          {!tooShort && !isLoading && results.length > 0 && (
            <ul className="py-1">
              {results.map((r, idx) => (
                <li key={r.siret || r.siren} role="none">
                  <button
                    type="button"
                    id={optionId(idx)}
                    role="option"
                    aria-selected={activeIdx === idx}
                    className={`w-full text-left px-3 py-2.5 flex gap-3 items-start hover:bg-muted/60 transition-colors ${
                      activeIdx === idx ? 'bg-muted/60' : ''
                    }`}
                    onClick={() => handleSelect(r)}
                    onMouseEnter={() => setActiveIdx(idx)}
                  >
                    <Building2 className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">
                        {r.name || 'Entreprise sans nom'}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        SIRET {r.siret}
                        {r.address.city ? ` · ${r.address.zip} ${r.address.city}` : ''}
                        {r.administrativeStatus === 'C' ? ' · Cessée' : ''}
                      </p>
                      {r.nafLabel && (
                        <p className="text-[11px] text-muted-foreground/80 truncate">
                          {r.nafLabel}
                        </p>
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
