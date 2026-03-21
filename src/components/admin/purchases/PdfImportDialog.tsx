import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import {
  X, Search, FileUp, Loader2,
  CheckCircle2, AlertCircle, FileText,
} from 'lucide-react';
import type { Supplier, PdfExtractedItem, PdfExtractResult, PdfImportStep } from './types';

// ─── PDF Import Dialog ────────────────────────────────────────────────────────

interface PdfImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  suppliers: Supplier[];
  pdfStep: PdfImportStep;
  setPdfStep: React.Dispatch<React.SetStateAction<PdfImportStep>>;
  pdfSupplierId: string;
  setPdfSupplierId: (id: string) => void;
  pdfFile: File | null;
  setPdfFile: (f: File | null) => void;
  pdfResult: PdfExtractResult | null;
  pdfItems: PdfExtractedItem[];
  pdfError: string;
  setPdfError: (e: string) => void;
  pdfSaving: boolean;
  pdfParseProgress: number;
  pdfDragging: boolean;
  setPdfDragging: (d: boolean) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onParse: () => void;
  onConfirm: () => void;
  onPatchItem: (idx: number, patch: Partial<PdfExtractedItem>) => void;
  onRemoveItem: (idx: number) => void;
  onReset: () => void;
  onDropzoneDrop: (e: React.DragEvent) => void;
}

export function PdfImportDialog({
  open,
  onOpenChange,
  suppliers,
  pdfStep,
  setPdfStep,
  pdfSupplierId,
  setPdfSupplierId,
  pdfFile,
  setPdfFile,
  pdfResult,
  pdfItems,
  pdfError,
  setPdfError,
  pdfSaving,
  pdfParseProgress,
  pdfDragging,
  setPdfDragging,
  fileInputRef,
  onParse,
  onConfirm,
  onPatchItem,
  onRemoveItem,
  onReset,
  onDropzoneDrop,
}: PdfImportDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { onOpenChange(false); onReset(); } }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Importer un bon de commande PDF
          </DialogTitle>
          <DialogDescription>
            L'IA analyse le PDF et extrait automatiquement les lignes produits. Vérifiez les données avant de créer le BdC.
          </DialogDescription>
        </DialogHeader>

        {/* Step: select */}
        {pdfStep === 'select' && (
          <div className="space-y-5 py-2">
            {pdfError && (
              <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-md text-sm text-destructive">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{pdfError}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Fournisseur</Label>
              <Select value={pdfSupplierId} onValueChange={setPdfSupplierId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner le fournisseur (facultatif mais recommandé)" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Fichier PDF</Label>
              <div
                className={[
                  'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
                  pdfDragging
                    ? 'border-primary bg-primary/5'
                    : 'border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/30',
                ].join(' ')}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setPdfDragging(true); }}
                onDragLeave={() => setPdfDragging(false)}
                onDrop={onDropzoneDrop}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0] || null;
                    setPdfFile(f);
                    setPdfError('');
                  }}
                />
                {pdfFile ? (
                  <div className="flex flex-col items-center gap-2">
                    <FileText className="h-10 w-10 text-primary" />
                    <p className="font-medium text-sm">{pdfFile.name}</p>
                    <p className="text-xs text-muted-foreground">{(pdfFile.size / 1024).toFixed(0)} Ko</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); setPdfFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                    >
                      <X className="h-3.5 w-3.5 mr-1" />Changer
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <FileUp className="h-10 w-10" />
                    <p className="text-sm">Cliquez pour sélectionner un PDF</p>
                    <p className="text-xs">ou glissez-déposez ici</p>
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => { onOpenChange(false); onReset(); }}>Annuler</Button>
              <Button onClick={onParse} disabled={!pdfFile}>
                <Search className="h-4 w-4 mr-2" />
                Analyser le PDF
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Step: parsing */}
        {pdfStep === 'parsing' && (
          <div className="py-10 flex flex-col items-center gap-6">
            <Loader2 className="h-12 w-12 text-primary animate-spin" />
            <div className="w-full max-w-sm space-y-2">
              <p className="text-center text-sm font-medium">Analyse en cours…</p>
              <Progress value={pdfParseProgress} className="h-2" />
              <p className="text-center text-xs text-muted-foreground">L'IA extrait les lignes produits du document</p>
            </div>
          </div>
        )}

        {/* Step: review */}
        {pdfStep === 'review' && (
          <div className="space-y-4 py-2">
            {/* Summary */}
            <div className="flex items-start gap-2 p-3 bg-primary/10 border border-primary/30 rounded-md text-sm">
              <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="text-foreground">
                  <strong>{pdfItems.length} ligne(s)</strong> extraite(s)
                  {pdfResult?.supplier_name && ` · Fournisseur détecté : ${pdfResult.supplier_name}`}
                  {pdfResult?.order_number && ` · Réf. fournisseur : ${pdfResult.order_number}`}
                </span>
                {pdfItems.filter(i => i.matched_product_id).length > 0 && (
                  <p className="text-xs text-green-700">
                    {pdfItems.filter(i => i.matched_product_id).length} produit(s) identifié(s) automatiquement dans votre catalogue
                  </p>
                )}
              </div>
            </div>

            {/* Fournisseur override si pas encore sélectionné */}
            {!pdfSupplierId && (
              <div className="space-y-1.5">
                <Label>Fournisseur (à sélectionner)</Label>
                <Select value={pdfSupplierId} onValueChange={setPdfSupplierId}>
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
            )}

            {/* Table des lignes extraites */}
            {pdfItems.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm border border-dashed rounded-md">
                Aucune ligne extraite. Revenez en arrière pour réessayer.
              </div>
            ) : (
              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-24">Réf.</TableHead>
                      <TableHead>Désignation</TableHead>
                      <TableHead className="w-32">Produit catalogue</TableHead>
                      <TableHead className="w-20 text-right">Qté</TableHead>
                      <TableHead className="w-28 text-right">PU HT (€)</TableHead>
                      <TableHead className="w-16 text-right">TVA %</TableHead>
                      <TableHead className="w-24 text-right">Total HT</TableHead>
                      <TableHead className="w-8"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pdfItems.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell>
                          <input
                            className="text-xs bg-transparent border-b border-transparent hover:border-border focus:border-primary outline-none w-full"
                            value={item.ref}
                            onChange={(e) => onPatchItem(idx, { ref: e.target.value })}
                          />
                        </TableCell>
                        <TableCell>
                          <input
                            className="text-sm bg-transparent border-b border-transparent hover:border-border focus:border-primary outline-none w-full"
                            value={item.name}
                            onChange={(e) => onPatchItem(idx, { name: e.target.value })}
                          />
                        </TableCell>
                        <TableCell>
                          {item.matched_product_id ? (
                            <span className="text-xs text-green-700 flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3 shrink-0" />
                              <span className="truncate max-w-[100px]" title={item.matched_product_name ?? ''}>
                                {item.matched_product_name}
                              </span>
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">Non trouvé</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <input
                            type="number"
                            min={1}
                            className="text-sm bg-transparent border-b border-transparent hover:border-border focus:border-primary outline-none w-full text-right"
                            value={item.quantity}
                            onChange={(e) => onPatchItem(idx, { quantity: parseInt(e.target.value) || 1 })}
                          />
                        </TableCell>
                        <TableCell>
                          <input
                            type="number"
                            min={0}
                            step={0.01}
                            className="text-sm bg-transparent border-b border-transparent hover:border-border focus:border-primary outline-none w-full text-right"
                            value={item.unit_price_ht}
                            onChange={(e) => onPatchItem(idx, { unit_price_ht: parseFloat(e.target.value) || 0 })}
                          />
                        </TableCell>
                        <TableCell>
                          <input
                            type="number"
                            min={0}
                            step={0.5}
                            className="text-sm bg-transparent border-b border-transparent hover:border-border focus:border-primary outline-none w-full text-right"
                            value={item.vat_rate}
                            onChange={(e) => onPatchItem(idx, { vat_rate: parseFloat(e.target.value) || 20 })}
                          />
                        </TableCell>
                        <TableCell className="text-right text-sm font-medium tabular-nums">
                          {(item.quantity * item.unit_price_ht).toFixed(2)} €
                        </TableCell>
                        <TableCell>
                          <button
                            className="text-muted-foreground hover:text-destructive transition-colors"
                            onClick={() => onRemoveItem(idx)}
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

            {/* Totaux PDF */}
            {pdfItems.length > 0 && (
              <div className="flex justify-end gap-6 text-sm">
                <span className="font-semibold">
                  Total HT : <span className="text-primary ml-1">
                    {pdfItems.reduce((s, l) => s + l.quantity * l.unit_price_ht, 0).toFixed(2)} €
                  </span>
                </span>
                <span className="text-muted-foreground">
                  Total TTC (est.) : <span className="font-semibold">
                    {pdfItems.reduce((s, l) => s + l.quantity * l.unit_price_ht * (1 + (l.vat_rate || 20) / 100), 0).toFixed(2)} €
                  </span>
                </span>
              </div>
            )}

            <DialogFooter className="flex-row justify-between gap-2">
              <Button variant="outline" onClick={() => { setPdfStep('select'); setPdfError(''); }}>
                ← Recommencer
              </Button>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => { onOpenChange(false); onReset(); }}>
                  Annuler
                </Button>
                <Button onClick={onConfirm} disabled={pdfSaving || pdfItems.length === 0}>
                  {pdfSaving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Création…</> : <>Créer le bon de commande</>}
                </Button>
              </div>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── XLS/CSV Import Dialog ────────────────────────────────────────────────────

interface XlsImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  suppliers: Supplier[];
  xlsSupplierId: string;
  setXlsSupplierId: (id: string) => void;
  xlsPreview: PdfExtractedItem[];
  setXlsPreview: React.Dispatch<React.SetStateAction<PdfExtractedItem[]>>;
  xlsError: string;
  setXlsError: (e: string) => void;
  xlsSaving: boolean;
  xlsInputRef: React.RefObject<HTMLInputElement | null>;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onImport: () => void;
}

export function XlsImportDialog({
  open,
  onOpenChange,
  suppliers,
  xlsSupplierId,
  setXlsSupplierId,
  xlsPreview,
  setXlsPreview,
  xlsError,
  setXlsError,
  xlsSaving,
  xlsInputRef,
  onFileChange,
  onImport,
}: XlsImportDialogProps) {
  return (
    <Dialog open={open} onOpenChange={v => { if (!v && !xlsSaving) { onOpenChange(false); setXlsPreview([]); setXlsError(''); if (xlsInputRef.current) xlsInputRef.current.value = ''; } }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileUp className="h-5 w-5 text-primary" />
            Importer un bon de commande CSV / XLS / XLSX
          </DialogTitle>
          <DialogDescription>
            Colonnes reconnues : <span className="font-mono text-xs">Référence</span>, <span className="font-mono text-xs">Désignation</span>, <span className="font-mono text-xs">Qté</span>, <span className="font-mono text-xs">PU HT</span>, <span className="font-mono text-xs">TVA%</span>, <span className="font-mono text-xs">EAN</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {xlsError && (
            <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-md text-sm text-destructive">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{xlsError}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Fournisseur</Label>
              <Select value={xlsSupplierId} onValueChange={setXlsSupplierId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner (facultatif)" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Fichier</Label>
              <input
                ref={xlsInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={onFileChange}
                className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:opacity-90 cursor-pointer"
              />
            </div>
          </div>

          {xlsPreview.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">
                Aperçu — {xlsPreview.length} ligne(s) détectée(s) · Total HT : <span className="text-primary font-semibold">{xlsPreview.reduce((s, l) => s + l.quantity * l.unit_price_ht, 0).toFixed(2)} €</span>
              </p>
              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-24">Réf.</TableHead>
                      <TableHead>Désignation</TableHead>
                      <TableHead className="w-20 text-right">Qté</TableHead>
                      <TableHead className="w-28 text-right">PU HT (€)</TableHead>
                      <TableHead className="w-16 text-right">TVA %</TableHead>
                      <TableHead className="w-24 text-right">Total HT</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {xlsPreview.slice(0, 10).map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-mono text-xs">{item.ref || '—'}</TableCell>
                        <TableCell className="text-sm">{item.name}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right">{item.unit_price_ht.toFixed(2)}</TableCell>
                        <TableCell className="text-right">{item.vat_rate}</TableCell>
                        <TableCell className="text-right font-medium">{(item.quantity * item.unit_price_ht).toFixed(2)} €</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {xlsPreview.length > 10 && (
                  <p className="text-xs text-muted-foreground px-3 py-2">… et {xlsPreview.length - 10} ligne(s) supplémentaire(s)</p>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="mt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={xlsSaving}>Annuler</Button>
          <Button onClick={onImport} disabled={xlsPreview.length === 0 || xlsSaving}>
            {xlsSaving
              ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Création…</>
              : <>Créer le bon de commande ({xlsPreview.length} ligne(s))</>
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Reception Dialog ─────────────────────────────────────────────────────────

interface ReceiveDialogProps {
  receivingOrder: import('./types').PurchaseOrder | null;
  onClose: () => void;
  receiveMode: 'global' | 'lines';
  setReceiveMode: (mode: 'global' | 'lines') => void;
  receiveLines: import('./types').ReceiveLine[];
  setReceiveLines: React.Dispatch<React.SetStateAction<import('./types').ReceiveLine[]>>;
  receiving: boolean;
  onReceive: () => void;
}

export function ReceiveDialog({
  receivingOrder,
  onClose,
  receiveMode,
  setReceiveMode,
  receiveLines,
  setReceiveLines,
  receiving,
  onReceive,
}: ReceiveDialogProps) {
  return (
    <Dialog
      open={!!receivingOrder}
      onOpenChange={v => { if (!v && !receiving) onClose(); }}
    >
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Réception — {receivingOrder?.order_number}
          </DialogTitle>
          <DialogDescription>
            Choisissez le mode de réception et validez les quantités à ajouter au stock.
          </DialogDescription>
        </DialogHeader>

        {receiveLines.length === 0 ? (
          <p className="text-center text-muted-foreground py-8 text-sm">
            Ce bon de commande n'a pas de lignes produits.
          </p>
        ) : (
          <div className="space-y-4 py-2">

            {/* Sélecteur de mode */}
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={receiveMode === 'global' ? 'default' : 'outline'}
                onClick={() => {
                  setReceiveMode('global');
                  setReceiveLines(ls =>
                    ls.map(l => ({ ...l, received: l.expected, status: 'recu' as const }))
                  );
                }}
              >
                ✅ Tout recevoir
              </Button>
              <Button
                size="sm"
                variant={receiveMode === 'lines' ? 'default' : 'outline'}
                onClick={() => setReceiveMode('lines')}
              >
                📋 Ligne par ligne
              </Button>
            </div>

            {/* Mode global — résumé */}
            {receiveMode === 'global' && (
              <div className="rounded-md border p-4 bg-muted/30 text-sm space-y-1">
                <p className="font-medium mb-2">
                  {receiveLines.length} ligne(s) ·{' '}
                  {receiveLines.reduce((s, l) => s + l.expected, 0)} unité(s) à mettre en stock
                </p>
                {receiveLines.map(l => (
                  <p key={l.po_item_id} className="text-muted-foreground">
                    {l.product_name} — <span className="font-medium text-foreground">{l.expected} unité(s)</span>
                    {!l.product_id && (
                      <span className="ml-2 text-xs text-yellow-600">(non lié à un produit catalogue)</span>
                    )}
                  </p>
                ))}
              </div>
            )}

            {/* Mode ligne par ligne — tableau éditable */}
            {receiveMode === 'lines' && (
              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produit</TableHead>
                      <TableHead className="w-24 text-right">Attendu</TableHead>
                      <TableHead className="w-28 text-right">Reçu</TableHead>
                      <TableHead className="w-36">Statut</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {receiveLines.map((line, idx) => (
                      <TableRow key={line.po_item_id}>
                        <TableCell className="font-medium text-sm">
                          {line.product_name}
                          {!line.product_id && (
                            <span className="ml-1 text-xs text-yellow-600">(non lié)</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {line.expected}
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={0}
                            max={line.expected}
                            className="h-8 text-right"
                            value={line.received}
                            onChange={e => {
                              const v = Math.min(line.expected, Math.max(0, parseInt(e.target.value) || 0));
                              setReceiveLines(ls => ls.map((l, i) => i !== idx ? l : {
                                ...l,
                                received: v,
                                status:   v === 0          ? 'non_livre'
                                        : v < l.expected   ? 'partiel'
                                        :                    'recu',
                              }));
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Select
                            value={line.status}
                            onValueChange={v =>
                              setReceiveLines(ls => ls.map((l, i) => i !== idx ? l : {
                                ...l,
                                status:   v as import('./types').ReceiveLine['status'],
                                received: v === 'non_livre' ? 0
                                        : v === 'recu'      ? l.expected
                                        : l.received,
                              }))
                            }
                          >
                            <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="recu">✅ Reçu complet</SelectItem>
                              <SelectItem value="partiel">🟡 Partiel</SelectItem>
                              <SelectItem value="non_livre">⚫ Non livré</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Barre de résumé */}
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground border-t pt-3">
              <span>Attendu : <b className="text-foreground">{receiveLines.reduce((s, l) => s + l.expected, 0)}</b></span>
              <span>Reçu : <b className="text-green-600">{receiveLines.reduce((s, l) => s + l.received, 0)}</b></span>
              <span>
                Non livré : <b className="text-red-500">
                  {receiveLines.filter(l => l.status === 'non_livre').length} ligne(s)
                </b>
              </span>
            </div>

          </div>
        )}

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose} disabled={receiving}>
            Annuler
          </Button>
          <Button
            onClick={onReceive}
            disabled={receiving || receiveLines.length === 0 || receiveLines.every(l => l.received === 0)}
          >
            {receiving ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Enregistrement…</>
            ) : (
              <>Valider la réception ({receiveLines.reduce((s, l) => s + l.received, 0)} unité(s))</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
