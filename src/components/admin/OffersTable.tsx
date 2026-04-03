import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { CatalogItem } from "@/types/supplier";
import { SUPPLIER_BADGE_COLORS } from "@/types/supplier";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Star } from "lucide-react";

interface OffersTableProps {
  offers: CatalogItem[];
  onToggle: (offerId: string, isActive: boolean) => void;
  isToggling: boolean;
  onSetPreferred?: (offerId: string, isPreferred: boolean) => void;
  isSettingPreferred?: boolean;
  onSetPriorityRank?: (offerId: string, rank: number | null) => void;
  isSettingRank?: boolean;
}

export function OffersTable({
  offers,
  onToggle,
  isToggling,
  onSetPreferred,
  isSettingPreferred,
  onSetPriorityRank,
  isSettingRank,
}: OffersTableProps) {
  if (offers.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Aucune offre fournisseur pour ce produit.
      </div>
    );
  }

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Fournisseur</TableHead>
            <TableHead>Réf. fournisseur</TableHead>
            <TableHead className="text-right">Stock</TableHead>
            <TableHead className="text-right">Délai (j)</TableHead>
            <TableHead className="text-right">PA HT</TableHead>
            <TableHead className="text-right">PVP TTC</TableHead>
            <TableHead>Qté min.</TableHead>
            <TableHead>Priorité</TableHead>
            <TableHead>Préféré</TableHead>
            <TableHead>Actif</TableHead>
            <TableHead>Màj</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {offers.map((offer) => {
            const badgeColor = offer.supplier_code
              ? SUPPLIER_BADGE_COLORS[offer.supplier_code as keyof typeof SUPPLIER_BADGE_COLORS] ?? ""
              : "";
            return (
              <TableRow key={offer.offer_id} className={!offer.is_active ? "opacity-50" : undefined}>
                <TableCell>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className={badgeColor}>
                      {offer.supplier_name}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground max-w-[140px] truncate">
                  {offer.supplier_sku ?? "—"}
                </TableCell>
                <TableCell className="text-right font-semibold">
                  <span className={offer.stock_qty > 0 ? "text-green-700" : "text-destructive"}>
                    {offer.stock_qty}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  {offer.delivery_delay_days ?? "—"}
                </TableCell>
                <TableCell className="text-right">
                  {offer.purchase_price_ht != null
                    ? `${Number(offer.purchase_price_ht).toFixed(2)} €`
                    : "—"}
                </TableCell>
                <TableCell className="text-right font-semibold">
                  {offer.pvp_ttc != null
                    ? `${Number(offer.pvp_ttc).toFixed(2)} €`
                    : <span className="text-muted-foreground">—</span>}
                </TableCell>
                <TableCell>{offer.min_order_qty}</TableCell>
                <TableCell>
                  <PriorityRankInput
                    value={offer.priority_rank}
                    onChange={(rank) => onSetPriorityRank?.(offer.offer_id, rank)}
                    disabled={!onSetPriorityRank || !!isSettingRank}
                  />
                </TableCell>
                <TableCell>
                  {onSetPreferred ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 gap-1"
                      disabled={!!isSettingPreferred}
                      onClick={() => onSetPreferred(offer.offer_id, !offer.is_preferred)}
                    >
                      <Star className={`h-3.5 w-3.5 ${offer.is_preferred ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`} />
                      <span className="text-xs">{offer.is_preferred ? 'Oui' : 'Non'}</span>
                    </Button>
                  ) : offer.is_preferred ? (
                    <Badge variant="secondary" className="gap-1 text-xs">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      Oui
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground text-xs">Non</span>
                  )}
                </TableCell>
                <TableCell>
                  <Switch
                    checked={offer.is_active}
                    disabled={isToggling}
                    onCheckedChange={(val) => onToggle(offer.offer_id, val)}
                    aria-label="Activer/désactiver cette offre"
                  />
                </TableCell>
                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                  {offer.last_seen_at
                    ? format(new Date(offer.last_seen_at), "dd/MM/yy HH:mm", { locale: fr })
                    : "—"}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function PriorityRankInput({
  value,
  onChange,
  disabled,
}: {
  value: number | null;
  onChange: (rank: number | null) => void;
  disabled: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value ?? ''));

  if (disabled || !onChange) {
    return <span className="text-xs text-muted-foreground tabular-nums">{value ?? '—'}</span>;
  }

  if (!editing) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-xs tabular-nums"
        onClick={() => { setDraft(String(value ?? '')); setEditing(true); }}
      >
        {value ?? '—'}
      </Button>
    );
  }

  return (
    <Input
      type="number"
      min={1}
      max={99}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        const parsed = draft.trim() === '' ? null : parseInt(draft, 10);
        if (parsed !== value) onChange(Number.isNaN(parsed) ? null : parsed);
        setEditing(false);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        if (e.key === 'Escape') setEditing(false);
      }}
      className="h-7 w-16 text-xs"
      autoFocus
    />
  );
}
