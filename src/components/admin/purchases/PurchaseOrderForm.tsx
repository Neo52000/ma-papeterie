import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, X } from 'lucide-react';
import { ProductAutocomplete, type ProductMatch } from '@/components/admin/ProductAutocomplete';
import type { PurchaseOrder, Supplier, OrderItem } from './types';
import { STATUS_OPTIONS } from './types';
import type { CreateForm, EditHeader } from '@/hooks/admin/usePurchaseOrderState';

// ─── Create Dialog ────────────────────────────────────────────────────────────

interface CreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  suppliers: Supplier[];
  createForm: CreateForm;
  setCreateForm: React.Dispatch<React.SetStateAction<CreateForm>>;
  creating: boolean;
  onSubmit: () => void;
}

export function CreatePurchaseOrderDialog({
  open,
  onOpenChange,
  suppliers,
  createForm,
  setCreateForm,
  creating,
  onSubmit,
}: CreateDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nouveau bon de commande</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Fournisseur</Label>
            <Select value={createForm.supplier_id} onValueChange={(v) => setCreateForm((f) => ({ ...f, supplier_id: v }))}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un fournisseur" />
              </SelectTrigger>
              <SelectContent>
                {suppliers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Date de livraison prévue</Label>
            <Input
              type="date"
              value={createForm.expected_delivery_date}
              onChange={(e) => setCreateForm((f) => ({ ...f, expected_delivery_date: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea
              placeholder="Notes internes…"
              value={createForm.notes}
              onChange={(e) => setCreateForm((f) => ({ ...f, notes: e.target.value }))}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={onSubmit} disabled={creating}>
            {creating ? 'Création…' : 'Créer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Edit Dialog ──────────────────────────────────────────────────────────────

interface EditDialogProps {
  editOrder: PurchaseOrder | null;
  onClose: () => void;
  suppliers: Supplier[];
  editHeader: EditHeader;
  setEditHeader: React.Dispatch<React.SetStateAction<EditHeader>>;
  editItems: OrderItem[];
  onAddLine: () => void;
  onRemoveLine: (idx: number) => void;
  onPatchLine: (idx: number, patch: Partial<OrderItem>) => void;
  onProductSelect: (idx: number, p: ProductMatch | null) => void;
  totalHT: number;
  totalTTC: number;
  saving: boolean;
  deleting: boolean;
  onSave: () => void;
  onDelete: () => void;
}

export function EditPurchaseOrderDialog({
  editOrder,
  onClose,
  suppliers,
  editHeader,
  setEditHeader,
  editItems,
  onAddLine,
  onRemoveLine,
  onPatchLine,
  onProductSelect,
  totalHT,
  totalTTC,
  saving,
  deleting,
  onSave,
  onDelete,
}: EditDialogProps) {
  return (
    <Dialog open={!!editOrder} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Modifier — {editOrder?.order_number}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* En-tête BdC */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Fournisseur</Label>
              <Select
                value={editHeader.supplier_id}
                onValueChange={(v) => setEditHeader((h) => ({ ...h, supplier_id: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner…" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Statut</Label>
              <Select
                value={editHeader.status}
                onValueChange={(v) => setEditHeader((h) => ({ ...h, status: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Date de livraison prévue</Label>
              <Input
                type="date"
                value={editHeader.expected_delivery_date}
                onChange={(e) => setEditHeader((h) => ({ ...h, expected_delivery_date: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label>Notes</Label>
              <Textarea
                value={editHeader.notes}
                onChange={(e) => setEditHeader((h) => ({ ...h, notes: e.target.value }))}
                rows={2}
              />
            </div>
          </div>

          {/* Lignes produits */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Lignes de commande</Label>
              <Button size="sm" variant="outline" onClick={onAddLine}>
                <Plus className="h-3.5 w-3.5 mr-1" />
                Ajouter une ligne
              </Button>
            </div>

            {editItems.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4 border border-dashed rounded-md">
                Aucune ligne — cliquez sur "Ajouter une ligne"
              </p>
            ) : (
              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produit</TableHead>
                      <TableHead className="w-24 text-right">Qté</TableHead>
                      <TableHead className="w-28 text-right">PU HT (€)</TableHead>
                      <TableHead className="w-28 text-right">Sous-total</TableHead>
                      <TableHead className="w-24 text-right">Qté reçue</TableHead>
                      <TableHead className="w-8"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {editItems.map((line, idx) => (
                      <TableRow key={idx}>
                        {/* Produit — autocomplete */}
                        <TableCell className="min-w-[220px]">
                          <ProductAutocomplete
                            value={line._product ?? null}
                            onChange={(p) => onProductSelect(idx, p)}
                          />
                        </TableCell>
                        {/* Quantité */}
                        <TableCell>
                          <Input
                            type="number"
                            min={1}
                            className="text-right h-8"
                            value={line.quantity}
                            onChange={(e) => onPatchLine(idx, { quantity: parseInt(e.target.value) || 1 })}
                          />
                        </TableCell>
                        {/* Prix HT */}
                        <TableCell>
                          <Input
                            type="number"
                            min={0}
                            step={0.01}
                            className="text-right h-8"
                            value={line.unit_price_ht}
                            onChange={(e) => onPatchLine(idx, { unit_price_ht: parseFloat(e.target.value) || 0 })}
                          />
                        </TableCell>
                        {/* Sous-total */}
                        <TableCell className="text-right text-sm font-medium tabular-nums">
                          {((line.quantity || 0) * (line.unit_price_ht || 0)).toFixed(2)} €
                        </TableCell>
                        {/* Reçu (lecture seule) */}
                        <TableCell className="text-right text-muted-foreground text-sm">
                          {line.received_quantity ?? 0}
                        </TableCell>
                        {/* Supprimer */}
                        <TableCell>
                          <button
                            className="text-muted-foreground hover:text-destructive transition-colors"
                            onClick={() => onRemoveLine(idx)}
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Totaux */}
            {editItems.length > 0 && (
              <div className="flex justify-end gap-6 pt-1 text-sm">
                <span>
                  Total HT : <span className="font-semibold text-primary">{totalHT.toFixed(2)} €</span>
                </span>
                <span className="text-muted-foreground">
                  Total TTC (est.) : <span className="font-semibold">{totalTTC.toFixed(2)} €</span>
                </span>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex-row justify-between gap-2">
          {editOrder?.status === 'draft' && (
            <Button
              variant="destructive"
              size="sm"
              disabled={deleting}
              onClick={onDelete}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              {deleting ? 'Suppression…' : 'Supprimer'}
            </Button>
          )}
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" onClick={onClose}>Annuler</Button>
            <Button onClick={onSave} disabled={saving}>
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
