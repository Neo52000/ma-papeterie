import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

const lineSchema = z.object({
  product_id: z.string().min(1, "Requis"),
  quantity: z.coerce.number().int().min(1),
  unit_price_ht: z.coerce.number().min(0),
});

const poSchema = z.object({
  supplier_id: z.string().min(1, "Fournisseur requis"),
  notes: z.string().optional(),
  lines: z.array(lineSchema).min(1, "Au moins une ligne"),
});

type POFormValues = z.infer<typeof poSchema>;

interface PurchaseOrderFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PurchaseOrderForm({ open, onOpenChange }: PurchaseOrderFormProps) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);

  const { data: suppliers } = useQuery({
    queryKey: ["suppliers-list"],
    queryFn: async () => {
      const { data } = await supabase
        .from("suppliers")
        .select("id, name")
        .eq("is_active", true)
        .order("name");
      return data ?? [];
    },
    staleTime: 5 * 60_000,
  });

  const form = useForm<POFormValues>({
    resolver: zodResolver(poSchema),
    defaultValues: {
      supplier_id: "",
      notes: "",
      lines: [{ product_id: "", quantity: 1, unit_price_ht: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "lines",
  });

  const totalHt = form.watch("lines").reduce(
    (sum, l) => sum + (l.quantity || 0) * (l.unit_price_ht || 0),
    0,
  );

  const onSubmit = async (values: POFormValues) => {
    setSaving(true);
    try {
      // Get next order number
      const { data: lastOrder } = await supabase
        .from("purchase_orders")
        .select("order_number")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const year = new Date().getFullYear();
      let nextNum = 1;
      if (lastOrder?.order_number) {
        const match = lastOrder.order_number.match(/(\d+)$/);
        if (match) nextNum = parseInt(match[1], 10) + 1;
      }
      const orderNumber = `PO-${year}-${String(nextNum).padStart(4, "0")}`;

      const { data: user } = await supabase.auth.getUser();
      const totalTtc = totalHt * 1.2;

      const { data: order, error: orderError } = await supabase
        .from("purchase_orders")
        .insert({
          order_number: orderNumber,
          supplier_id: values.supplier_id,
          status: "draft",
          total_ht: totalHt,
          total_ttc: totalTtc,
          created_by: user.user?.id || "",
          notes: values.notes || null,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      const items = values.lines.map((line) => ({
        purchase_order_id: order.id,
        product_id: line.product_id,
        quantity: line.quantity,
        unit_price_ht: line.unit_price_ht,
        unit_price_ttc: line.unit_price_ht * 1.2,
      }));

      const { error: itemsError } = await supabase
        .from("purchase_order_items")
        .insert(items);

      if (itemsError) throw itemsError;

      toast.success(`Bon de commande ${orderNumber} créé`);
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      form.reset();
      onOpenChange(false);
    } catch (e: any) {
      toast.error("Erreur création PO: " + (e.message || "Erreur inconnue"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nouveau bon de commande</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Supplier */}
          <div className="space-y-2">
            <Label>Fournisseur</Label>
            <select
              {...form.register("supplier_id")}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Sélectionner...</option>
              {suppliers?.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            {form.formState.errors.supplier_id && (
              <p className="text-sm text-destructive">{form.formState.errors.supplier_id.message}</p>
            )}
          </div>

          {/* Lines */}
          <div className="space-y-3">
            <Label>Lignes</Label>
            {fields.map((field, index) => (
              <div key={field.id} className="flex gap-2 items-end">
                <div className="flex-1">
                  <Input
                    placeholder="ID Produit"
                    {...form.register(`lines.${index}.product_id`)}
                  />
                </div>
                <div className="w-24">
                  <Input
                    type="number"
                    placeholder="Qté"
                    {...form.register(`lines.${index}.quantity`)}
                  />
                </div>
                <div className="w-28">
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Prix HT"
                    {...form.register(`lines.${index}.unit_price_ht`)}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => fields.length > 1 && remove(index)}
                  disabled={fields.length <= 1}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ product_id: "", quantity: 1, unit_price_ht: 0 })}
            >
              <Plus className="h-4 w-4 mr-1" /> Ajouter une ligne
            </Button>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea {...form.register("notes")} placeholder="Notes internes..." />
          </div>

          {/* Total */}
          <div className="text-right font-bold text-lg">
            Total HT : {totalHt.toFixed(2)} €
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Création..." : "Créer le bon de commande"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
