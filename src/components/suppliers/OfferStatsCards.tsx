import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle } from 'lucide-react';
import {
  type SupplierCode,
  SUPPLIER_CODES,
  SUPPLIER_BADGE_COLORS,
} from '@/types/supplier';

interface OfferStats {
  total: number;
  active: number;
  inactive: number;
  bySupplier: Record<string, number>;
}

interface OfferStatsCardsProps {
  stats: OfferStats | undefined;
}

export function OfferStatsCards({ stats }: OfferStatsCardsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      <Card>
        <CardContent className="pt-4 pb-3">
          <p className="text-2xl font-bold">{stats?.total ?? '…'}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Total offres</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            <p className="text-2xl font-bold">{stats?.active ?? '…'}</p>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">Actives</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-1.5">
            <XCircle className="h-4 w-4 text-muted-foreground" />
            <p className="text-2xl font-bold">{stats?.inactive ?? '…'}</p>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">Inactives</p>
        </CardContent>
      </Card>
      {SUPPLIER_CODES.map((s: SupplierCode) => (
        <Card key={s}>
          <CardContent className="pt-4 pb-3">
            <p className="text-2xl font-bold">{stats?.bySupplier[s] ?? 0}</p>
            <Badge className={`text-xs mt-0.5 border ${SUPPLIER_BADGE_COLORS[s]}`} variant="outline">{s}</Badge>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
