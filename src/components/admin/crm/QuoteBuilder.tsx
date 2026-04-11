import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus, Trash2, Send, Save, Loader2 } from "lucide-react";
import { useCreateQuote, type QuoteItem } from "@/hooks/admin/useQuotes";
import { toast } from "sonner";

const fmtPrice = (v: number) =>
  new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);

interface Props {
  onSuccess?: () => void;
}

export function QuoteBuilder({ onSuccess }: Props) {
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("30 jours fin de mois");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<QuoteItem[]>([
    { ref: "", label: "", qty: 1, unit_price_ht: 0, tva_rate: 20, total_ht: 0 },
  ]);

  const createQuote = useCreateQuote();

  const addLine = () => {
    setItems([...items, { ref: "", label: "", qty: 1, unit_price_ht: 0, tva_rate: 20, total_ht: 0 }]);
  };

  const removeLine = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const updateLine = (index: number, field: keyof QuoteItem, value: string | number) => {
    const updated = [...items];
    (updated[index] as Record<string, unknown>)[field] = value;
    // Recalculate total_ht
    updated[index].total_ht = Math.round(updated[index].qty * updated[index].unit_price_ht * 100) / 100;
    setItems(updated);
  };

  const totals = useMemo(() => {
    const subtotalHt = items.reduce((sum, i) => sum + i.qty * i.unit_price_ht, 0);
    const tvaByRate: Record<number, number> = {};
    for (const item of items) {
      const rate = item.tva_rate;
      tvaByRate[rate] = (tvaByRate[rate] ?? 0) + item.qty * item.unit_price_ht;
    }
    const tvaAmount = Object.entries(tvaByRate).reduce(
      (sum, [rate, base]) => sum + base * (Number(rate) / 100), 0,
    );
    return {
      subtotalHt: Math.round(subtotalHt * 100) / 100,
      tvaAmount: Math.round(tvaAmount * 100) / 100,
      totalTtc: Math.round((subtotalHt + tvaAmount) * 100) / 100,
    };
  }, [items]);

  const handleSubmit = (sendEmail: boolean) => {
    if (!contactName.trim() || !contactEmail.trim()) {
      toast.error("Nom et email du contact requis");
      return;
    }
    if (items.every((i) => !i.label.trim())) {
      toast.error("Ajoutez au moins un produit");
      return;
    }

    const validItems = items
      .filter((i) => i.label.trim())
      .map((i) => ({
        ...i,
        total_ht: Math.round(i.qty * i.unit_price_ht * 100) / 100,
      }));

    createQuote.mutate(
      {
        contactName: contactName.trim(),
        contactEmail: contactEmail.trim(),
        companyName: companyName.trim() || undefined,
        items: validItems,
        paymentTerms: paymentTerms.trim() || undefined,
        notes: notes.trim() || undefined,
        sendEmail,
      },
      {
        onSuccess: (data) => {
          toast.success(
            sendEmail
              ? `Devis ${data.quote_number} cree et envoye`
              : `Devis ${data.quote_number} cree`,
          );
          onSuccess?.();
        },
        onError: () => toast.error("Erreur lors de la creation du devis"),
      },
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nouveau devis</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Contact info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Nom du contact *</label>
            <Input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Jean Dupont" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Email *</label>
            <Input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="contact@entreprise.fr" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Entreprise</label>
            <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Entreprise SAS" />
          </div>
        </div>

        {/* Items table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Ref.</TableHead>
                <TableHead>Designation</TableHead>
                <TableHead className="w-[80px]">Qte</TableHead>
                <TableHead className="w-[120px]">P.U. HT</TableHead>
                <TableHead className="w-[80px]">TVA %</TableHead>
                <TableHead className="w-[120px] text-right">Total HT</TableHead>
                <TableHead className="w-[40px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Input
                      value={item.ref}
                      onChange={(e) => updateLine(index, "ref", e.target.value)}
                      placeholder="REF"
                      className="h-8 text-sm"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={item.label}
                      onChange={(e) => updateLine(index, "label", e.target.value)}
                      placeholder="Designation du produit"
                      className="h-8 text-sm"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={item.qty}
                      onChange={(e) => updateLine(index, "qty", parseInt(e.target.value) || 0)}
                      className="h-8 text-sm"
                      min="1"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={item.unit_price_ht}
                      onChange={(e) => updateLine(index, "unit_price_ht", parseFloat(e.target.value) || 0)}
                      className="h-8 text-sm"
                      step="0.01"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={item.tva_rate}
                      onChange={(e) => updateLine(index, "tva_rate", parseFloat(e.target.value) || 20)}
                      className="h-8 text-sm"
                    />
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {fmtPrice(item.qty * item.unit_price_ht)} EUR
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 text-red-500"
                      onClick={() => removeLine(index)}
                      disabled={items.length <= 1}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <Button variant="outline" size="sm" onClick={addLine}>
          <Plus className="h-4 w-4 mr-1" />
          Ajouter une ligne
        </Button>

        {/* Totals */}
        <div className="flex justify-end">
          <div className="space-y-1 text-sm w-64">
            <div className="flex justify-between">
              <span>Sous-total HT</span>
              <span className="font-mono">{fmtPrice(totals.subtotalHt)} EUR</span>
            </div>
            <div className="flex justify-between">
              <span>TVA</span>
              <span className="font-mono">{fmtPrice(totals.tvaAmount)} EUR</span>
            </div>
            <div className="flex justify-between font-bold text-base border-t pt-1">
              <span>Total TTC</span>
              <span className="font-mono">{fmtPrice(totals.totalTtc)} EUR</span>
            </div>
          </div>
        </div>

        {/* Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Conditions de paiement</label>
            <Input value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Notes</label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={() => handleSubmit(false)} disabled={createQuote.isPending}>
            {createQuote.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            <Save className="h-4 w-4 mr-2" />
            Sauvegarder brouillon
          </Button>
          <Button onClick={() => handleSubmit(true)} disabled={createQuote.isPending}>
            {createQuote.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            <Send className="h-4 w-4 mr-2" />
            Creer et envoyer
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
