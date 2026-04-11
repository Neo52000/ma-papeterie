import { useState } from "react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useStockThresholds,
  useUpsertStockThreshold,
  useDeleteStockThreshold,
} from "@/hooks/admin/useStockThresholds";
import { toast } from "sonner";
import { Loader2, Save, Trash2, Plus } from "lucide-react";

interface EditRow {
  id?: string;
  product_id: string;
  min_quantity: number;
  reorder_quantity: number;
  supplier_id: string;
  lead_time_days: number;
}

export function StockThresholdEditor() {
  const { data: thresholds, isLoading } = useStockThresholds();
  const upsertMutation = useUpsertStockThreshold();
  const deleteMutation = useDeleteStockThreshold();
  const [newRow, setNewRow] = useState<EditRow | null>(null);

  const handleSave = async (row: EditRow) => {
    try {
      await upsertMutation.mutateAsync({
        id: row.id,
        product_id: row.product_id,
        min_quantity: row.min_quantity,
        reorder_quantity: row.reorder_quantity,
        supplier_id: row.supplier_id || null,
        lead_time_days: row.lead_time_days,
      });
      toast.success("Seuil sauvegardé");
      setNewRow(null);
    } catch (e: unknown) {
      toast.error("Erreur : " + (e instanceof Error ? e.message : "Erreur inconnue"));
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      toast.success("Seuil supprimé");
    } catch (e: unknown) {
      toast.error("Erreur : " + (e instanceof Error ? e.message : "Erreur inconnue"));
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          {thresholds?.length ?? 0} seuil(s) configuré(s)
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            setNewRow({
              product_id: "",
              min_quantity: 5,
              reorder_quantity: 20,
              supplier_id: "",
              lead_time_days: 7,
            })
          }
        >
          <Plus className="h-4 w-4 mr-1" /> Ajouter un seuil
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Produit</TableHead>
            <TableHead>SKU</TableHead>
            <TableHead className="text-right">Seuil min</TableHead>
            <TableHead className="text-right">Qté réappro</TableHead>
            <TableHead>Fournisseur</TableHead>
            <TableHead className="text-right">Délai (j)</TableHead>
            <TableHead className="w-[80px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {newRow && (
            <TableRow className="bg-blue-50">
              <TableCell>
                <Input
                  placeholder="ID Produit"
                  value={newRow.product_id}
                  onChange={(e) => setNewRow({ ...newRow, product_id: e.target.value })}
                  className="h-8"
                />
              </TableCell>
              <TableCell>-</TableCell>
              <TableCell>
                <Input
                  type="number"
                  value={newRow.min_quantity}
                  onChange={(e) => setNewRow({ ...newRow, min_quantity: Number(e.target.value) })}
                  className="h-8 w-20 text-right"
                />
              </TableCell>
              <TableCell>
                <Input
                  type="number"
                  value={newRow.reorder_quantity}
                  onChange={(e) => setNewRow({ ...newRow, reorder_quantity: Number(e.target.value) })}
                  className="h-8 w-20 text-right"
                />
              </TableCell>
              <TableCell>
                <Input
                  placeholder="ID Fournisseur"
                  value={newRow.supplier_id}
                  onChange={(e) => setNewRow({ ...newRow, supplier_id: e.target.value })}
                  className="h-8"
                />
              </TableCell>
              <TableCell>
                <Input
                  type="number"
                  value={newRow.lead_time_days}
                  onChange={(e) => setNewRow({ ...newRow, lead_time_days: Number(e.target.value) })}
                  className="h-8 w-16 text-right"
                />
              </TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleSave(newRow)}>
                    <Save className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setNewRow(null)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          )}
          {thresholds?.map((t) => (
            <TableRow key={t.id}>
              <TableCell className="font-medium max-w-[180px] truncate">
                {t.product_name || t.product_id}
              </TableCell>
              <TableCell className="font-mono text-xs">{t.product_sku || "-"}</TableCell>
              <TableCell className="text-right">{t.min_quantity}</TableCell>
              <TableCell className="text-right">{t.reorder_quantity}</TableCell>
              <TableCell className="text-sm">{t.supplier_name || "-"}</TableCell>
              <TableCell className="text-right">{t.lead_time_days}</TableCell>
              <TableCell>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-destructive"
                  onClick={() => handleDelete(t.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {!thresholds?.length && !newRow && (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                Aucun seuil configuré. Les valeurs par défaut des produits seront utilisées.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
