import { useState } from 'react';
import {
  RefreshCw, Plus, Trash2, ShoppingCart, Sparkles, Package, Search, Loader2, ChevronDown, ChevronUp,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useB2BAccount } from '@/hooks/useB2BAccount';
import {
  useB2BReorderTemplates,
  useB2BTopProducts,
  useB2BReorderTemplateMutations,
  type ReorderTemplate,
} from '@/hooks/useB2BReorderTemplates';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';

interface ProductSearchResult {
  id: string;
  name: string;
  price: number;
  price_ttc: number | null;
  image_url: string | null;
  category: string;
  stock_quantity: number | null;
}

export default function ProReassort() {
  const { user } = useAuth();
  const { account } = useB2BAccount();
  const { data: templates = [], isLoading } = useB2BReorderTemplates(account?.id);
  const { data: topProducts = [], isLoading: topLoading } = useB2BTopProducts(account?.id);
  const { createTemplate, deleteTemplate, orderFromTemplate } = useB2BReorderTemplateMutations();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [searchResults, setSearchResults] = useState<ProductSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [draftItems, setDraftItems] = useState<{ product_id: string; product_name: string; quantity: number }[]>([]);
  const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null);
  const [ordering, setOrdering] = useState<string | null>(null);

  const handleProductSearch = async (q: string) => {
    setProductSearch(q);
    if (q.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const { data } = await supabase
        .from('products')
        .select('id, name, price, price_ttc, image_url, category, stock_quantity')
        .ilike('name', `%${q}%`)
        .eq('is_active', true)
        .limit(8);
      setSearchResults(data ?? []);
    } finally {
      setSearching(false);
    }
  };

  const addToDraft = (product: ProductSearchResult) => {
    setDraftItems(prev => {
      const exists = prev.find(i => i.product_id === product.id);
      if (exists) return prev.map(i => i.product_id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { product_id: product.id, product_name: product.name, quantity: 1 }];
    });
    setProductSearch('');
    setSearchResults([]);
  };

  const handleCreateTemplate = async () => {
    if (!newName.trim()) { toast.error('Nommez votre template'); return; }
    if (!account?.id) return;
    await createTemplate.mutateAsync({
      accountId: account.id,
      name: newName,
      description: newDesc || undefined,
      items: draftItems,
      createdBy: user?.id,
    });
    setShowCreateDialog(false);
    setNewName(''); setNewDesc(''); setDraftItems([]);
  };

  const handleOrderTemplate = async (template: ReorderTemplate) => {
    setOrdering(template.id);
    await orderFromTemplate(template);
    setOrdering(null);
  };

  const handleCreateFromSuggestion = (topProduct: { product_id: string; product_name: string; total_qty: number }) => {
    setDraftItems([{ product_id: topProduct.product_id, product_name: topProduct.product_name, quantity: Math.max(1, Math.ceil(topProduct.total_qty / 4)) }]);
    setNewName(`Réassort — ${topProduct.product_name.slice(0, 30)}`);
    setShowCreateDialog(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Réassort rapide</h2>
          <p className="text-sm text-muted-foreground">Re-commandez en 1 clic depuis vos templates</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Nouveau template
        </Button>
      </div>

      {/* Mes templates */}
      <div>
        <h3 className="font-medium mb-3 flex items-center gap-2">
          <RefreshCw className="h-4 w-4 text-primary" /> Mes templates
        </h3>

        {isLoading ? (
          <div className="space-y-2">
            {[...Array(2)].map((_, i) => <div key={i} className="h-16 animate-pulse bg-muted rounded-lg" />)}
          </div>
        ) : templates.filter(t => !t.is_auto_generated).length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-6 text-center text-muted-foreground text-sm">
              Aucun template. Créez-en un pour commander en 1 clic.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {templates.filter(t => !t.is_auto_generated).map(template => (
              <Card key={template.id} className="overflow-hidden">
                <div className="flex items-center justify-between p-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{template.name}</p>
                      <Badge variant="outline" className="text-xs shrink-0">
                        {template.items?.length ?? 0} produit{(template.items?.length ?? 0) > 1 ? 's' : ''}
                      </Badge>
                    </div>
                    {template.description && (
                      <p className="text-xs text-muted-foreground truncate">{template.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpandedTemplate(expandedTemplate === template.id ? null : template.id)}
                    >
                      {expandedTemplate === template.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleOrderTemplate(template)}
                      disabled={ordering === template.id}
                      className="gap-1"
                    >
                      {ordering === template.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <ShoppingCart className="h-3 w-3" />}
                      Commander
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => deleteTemplate.mutate(template.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {expandedTemplate === template.id && template.items && (
                  <div className="border-t bg-muted/30 px-4 py-3">
                    <div className="space-y-1">
                      {template.items.map(item => (
                        <div key={item.id} className="flex items-center justify-between text-sm">
                          <span className="truncate">{item.product_name}</span>
                          <span className="text-muted-foreground ml-2 shrink-0">×{item.quantity}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Suggestions basées sur l'historique */}
      <div>
        <h3 className="font-medium mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-orange-500" /> Produits commandés fréquemment
          <span className="text-xs text-muted-foreground font-normal">(90 derniers jours)</span>
        </h3>

        {topLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[...Array(4)].map((_, i) => <div key={i} className="h-14 animate-pulse bg-muted rounded-lg" />)}
          </div>
        ) : topProducts.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-5 text-center text-muted-foreground text-sm">
              Pas encore assez d'historique pour générer des suggestions.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {topProducts.map(p => (
              <div
                key={p.product_id}
                className="flex items-center justify-between bg-card border border-border/50 rounded-lg px-3 py-2 hover:border-primary/20 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{p.product_name}</p>
                  <p className="text-xs text-muted-foreground">{p.total_qty} unités commandées</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs gap-1 shrink-0"
                  onClick={() => handleCreateFromSuggestion(p)}
                >
                  <Plus className="h-3 w-3" /> Template
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Dialogue création template */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Créer un template de réassort</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium mb-1 block">Nom *</label>
              <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Ex. Fournitures bureau mensuel" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Description (optionnel)</label>
              <Input value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Commande mensuelle standard" />
            </div>

            {/* Recherche produits */}
            <div>
              <label className="text-sm font-medium mb-1 block">Ajouter des produits</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  value={productSearch}
                  onChange={e => handleProductSearch(e.target.value)}
                  placeholder="Rechercher un produit…"
                />
              </div>
              {(searchResults.length > 0 || searching) && (
                <div className="mt-1 border rounded-lg bg-popover shadow-md max-h-48 overflow-y-auto">
                  {searching && <div className="p-3 text-sm text-center text-muted-foreground">Recherche…</div>}
                  {searchResults.map(p => (
                    <button
                      key={p.id}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors border-b last:border-0"
                      onClick={() => addToDraft(p)}
                    >
                      <span className="font-medium">{p.name}</span>
                      <span className="text-muted-foreground ml-2">{(p.price_ttc ?? p.price).toFixed(2)}€</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Items sélectionnés */}
            {draftItems.length > 0 && (
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {draftItems.map(item => (
                  <div key={item.product_id} className="flex items-center gap-2 text-sm bg-muted rounded px-3 py-1.5">
                    <span className="flex-1 truncate">{item.product_name}</span>
                    <Input
                      type="number"
                      min={1}
                      value={item.quantity}
                      className="h-7 w-16 text-center p-1"
                      onChange={e =>
                        setDraftItems(prev =>
                          prev.map(i => i.product_id === item.product_id ? { ...i, quantity: Math.max(1, +e.target.value) } : i)
                        )
                      }
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-destructive"
                      onClick={() => setDraftItems(prev => prev.filter(i => i.product_id !== item.product_id))}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Annuler</Button>
            <Button onClick={handleCreateTemplate} disabled={createTemplate.isPending} className="gap-2">
              {createTemplate.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Créer le template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
