import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { usePriceModeStore } from "@/stores/priceModeStore";
import { cn } from "@/lib/utils";
import { formatPricingValue } from "@/data/pricing";
import type { PricingTable } from "@/data/pricing";

interface PricingDetailSectionProps {
  title?: string;
  tables: PricingTable[];
}

// ── Component ────────────────────────────────────────────────────────────────

export function PricingDetailSection({ title, tables }: PricingDetailSectionProps) {
  const mode = usePriceModeStore((s) => s.mode);

  if (tables.length === 0) return null;

  return (
    <div>
      {title && (
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold">{title}</h3>
          <Badge variant="outline">{mode === "ttc" ? "Prix TTC" : "Prix HT"}</Badge>
        </div>
      )}
      <div className="space-y-6">
        {tables.map((table, i) => (
          <Card key={i}>
            {table.title && (
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{table.title}</CardTitle>
              </CardHeader>
            )}
            <CardContent className={table.title ? "pt-0" : "pt-6"}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Option</TableHead>
                    <TableHead className="text-right">Prix</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {table.rows.map((row, j) => (
                    <TableRow
                      key={j}
                      className={cn(row.highlight && "bg-primary/5 font-medium")}
                    >
                      <TableCell>{row.label}</TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatPricingValue(row.price_ht, row.display, row.suffix, mode)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))}
      </div>
      {!title && (
        <div className="flex justify-end mt-2">
          <Badge variant="outline" className="text-xs">{mode === "ttc" ? "Prix TTC" : "Prix HT"}</Badge>
        </div>
      )}
    </div>
  );
}
