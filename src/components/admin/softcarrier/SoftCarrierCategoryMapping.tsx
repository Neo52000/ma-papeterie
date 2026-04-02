import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Wand2, Loader2, Check, X, Trash2, Plus, FolderTree, ExternalLink } from "lucide-react";
import { useCategories, useSupplierCategoryMappings } from "@/hooks/useCategories";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Link } from "react-router-dom";

// ── Fuzzy matching ──────────────────────────────────────────────────────────

function normalize(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, " ").trim();
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) => {
    const row = new Array(n + 1).fill(0);
    row[0] = i;
    return row;
  });
  for (let j = 1; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function similarity(a: string, b: string): number {
  const na = normalize(a), nb = normalize(b);
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) return 0.85;
  const wordsA = new Set(na.split(/\s+/));
  const wordsB = new Set(nb.split(/\s+/));
  const intersection = [...wordsA].filter(w => wordsB.has(w)).length;
  const union = new Set([...wordsA, ...wordsB]).size;
  const jaccard = union > 0 ? intersection / union : 0;
  const maxLen = Math.max(na.length, nb.length);
  const lev = maxLen > 0 ? 1 - levenshtein(na, nb) / maxLen : 0;
  return Math.max(jaccard, lev);
}

interface FuzzySuggestion {
  supplierCategoryName: string;
  supplierSubcategoryName: string | null;
  matchedCategoryId: string;
  matchedCategoryName: string;
  score: number;
}

// ── Component ───────────────────────────────────────────────────────────────

export function SoftCarrierCategoryMapping() {
  const { categories } = useCategories();
  const { mappings, loading: mappingsLoading, createMapping, updateMapping, deleteMapping } = useSupplierCategoryMappings();

  const [softSupplierId, setSoftSupplierId] = useState<string | null>(null);
  const [fuzzyLoading, setFuzzyLoading] = useState(false);
  const [fuzzySuggestions, setFuzzySuggestions] = useState<FuzzySuggestion[]>([]);
  const [fuzzyRan, setFuzzyRan] = useState(false);
  const [unmappedCount, setUnmappedCount] = useState<number | null>(null);

  // Adding new mapping
  const [addingMapping, setAddingMapping] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newSubCatName, setNewSubCatName] = useState('');
  const [newTargetCatId, setNewTargetCatId] = useState('');

  // Resolve Soft Carrier supplier ID
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('suppliers')
        .select('id')
        .or("code.eq.SOFT,name.ilike.%softcarrier%,name.ilike.%soft carrier%")
        .limit(1)
        .maybeSingle();
      if (data) setSoftSupplierId(data.id);
    })();
  }, []);

  // Filter mappings to Soft Carrier only
  const softMappings = useMemo(() => {
    if (!softSupplierId) return [];
    return mappings
      .filter(m => m.supplier_id === softSupplierId)
      .map(m => ({
        ...m,
        category_name: categories.find(c => c.id === m.category_id)?.name || 'Inconnue',
      }));
  }, [mappings, softSupplierId, categories]);

  const verifiedCount = softMappings.filter(m => m.is_verified).length;
  const unverifiedCount = softMappings.filter(m => !m.is_verified).length;

  // ── Fuzzy detection on Soft Carrier products ──

  const runFuzzyDetection = async () => {
    if (!softSupplierId) {
      toast.error("Fournisseur Soft Carrier non trouvé");
      return;
    }
    setFuzzyLoading(true);
    try {
      // Get distinct categories from Soft Carrier products
      const { data: products } = await supabase
        .from('products')
        .select('category, subcategory')
        .not('ref_softcarrier', 'is', null);

      if (!products) { setFuzzySuggestions([]); return; }

      const distinctCats = new Map<string, Set<string>>();
      products.forEach(p => {
        if (p.category && p.category !== 'Non classé') {
          if (!distinctCats.has(p.category)) distinctCats.set(p.category, new Set());
          if (p.subcategory) distinctCats.get(p.category)?.add(p.subcategory);
        }
      });

      // Already mapped
      const alreadyMapped = new Set(
        softMappings.map(m => `${m.supplier_category_name}::${m.supplier_subcategory_name || ''}`)
      );

      const suggestions: FuzzySuggestion[] = [];
      const MIN_SCORE = 0.4;
      let totalUnmapped = 0;

      distinctCats.forEach((_subCats, catName) => {
        const key = `${catName}::`;
        if (alreadyMapped.has(key)) return;

        // Check exact match in internal categories
        const exactMatch = categories.find(c => normalize(c.name) === normalize(catName));
        if (exactMatch) return;

        totalUnmapped++;

        // Find best fuzzy match
        let bestMatch: { id: string; name: string } | null = null;
        let bestScore = 0;
        categories.forEach(cat => {
          const score = similarity(catName, cat.name);
          if (score > bestScore && score >= MIN_SCORE) {
            bestScore = score;
            bestMatch = { id: cat.id, name: cat.name };
          }
        });

        if (bestMatch) {
          suggestions.push({
            supplierCategoryName: catName,
            supplierSubcategoryName: null,
            matchedCategoryId: bestMatch.id,
            matchedCategoryName: bestMatch.name,
            score: bestScore,
          });
        }
      });

      suggestions.sort((a, b) => b.score - a.score);
      setFuzzySuggestions(suggestions);
      setFuzzyRan(true);
      setUnmappedCount(totalUnmapped);

      if (suggestions.length === 0 && totalUnmapped === 0) {
        toast.success("Toutes les catégories Soft Carrier sont mappées");
      } else {
        toast.success(`${suggestions.length} suggestion(s) sur ${totalUnmapped} catégorie(s) non mappée(s)`);
      }
    } catch {
      toast.error("Erreur lors de l'analyse");
    } finally {
      setFuzzyLoading(false);
    }
  };

  const acceptSuggestion = async (s: FuzzySuggestion) => {
    if (!softSupplierId) return;
    const success = await createMapping({
      category_id: s.matchedCategoryId,
      supplier_id: softSupplierId,
      supplier_category_name: s.supplierCategoryName,
      supplier_subcategory_name: s.supplierSubcategoryName || undefined,
      is_verified: false,
    });
    if (success) {
      setFuzzySuggestions(prev => prev.filter(x => x.supplierCategoryName !== s.supplierCategoryName));
    }
  };

  const handleAddMapping = async () => {
    if (!softSupplierId || !newCatName || !newTargetCatId) return;
    const success = await createMapping({
      category_id: newTargetCatId,
      supplier_id: softSupplierId,
      supplier_category_name: newCatName,
      supplier_subcategory_name: newSubCatName || undefined,
      is_verified: true,
    });
    if (success) {
      setAddingMapping(false);
      setNewCatName('');
      setNewSubCatName('');
      setNewTargetCatId('');
    }
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="flex items-center gap-4 flex-wrap">
        <Badge variant="outline" className="gap-1">
          <FolderTree className="h-3 w-3" />
          {softMappings.length} mapping(s)
        </Badge>
        <Badge variant="secondary">{verifiedCount} vérifiés</Badge>
        {unverifiedCount > 0 && (
          <Badge variant="destructive">{unverifiedCount} non vérifiés</Badge>
        )}
        {unmappedCount !== null && unmappedCount > 0 && (
          <Badge variant="outline" className="text-orange-600 border-orange-300">
            {unmappedCount} catégorie(s) non mappée(s)
          </Badge>
        )}
        <Link to="/admin/categories" className="ml-auto text-xs text-muted-foreground hover:text-primary flex items-center gap-1">
          Gestion complète des catégories <ExternalLink className="h-3 w-3" />
        </Link>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={runFuzzyDetection} disabled={fuzzyLoading || !softSupplierId}>
          {fuzzyLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Wand2 className="h-4 w-4 mr-2" />}
          Détection automatique
        </Button>
        <Button variant="outline" onClick={() => setAddingMapping(true)} disabled={!softSupplierId}>
          <Plus className="h-4 w-4 mr-2" />
          Nouveau mapping
        </Button>
      </div>

      {/* New mapping form */}
      {addingMapping && (
        <Card className="border-primary/30">
          <CardContent className="pt-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Catégorie fournisseur *</label>
                <input
                  className="w-full px-3 py-2 border rounded-md text-sm"
                  value={newCatName}
                  onChange={e => setNewCatName(e.target.value)}
                  placeholder="Ex: Écriture"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Sous-catégorie (optionnel)</label>
                <input
                  className="w-full px-3 py-2 border rounded-md text-sm"
                  value={newSubCatName}
                  onChange={e => setNewSubCatName(e.target.value)}
                  placeholder="Ex: Stylos"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">→ Catégorie interne *</label>
                <Select value={newTargetCatId} onValueChange={setNewTargetCatId}>
                  <SelectTrigger className="text-sm"><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                  <SelectContent>
                    {categories.filter(c => c.is_active).map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAddMapping} disabled={!newCatName || !newTargetCatId}>
                <Check className="h-3.5 w-3.5 mr-1" />Créer
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setAddingMapping(false)}>
                Annuler
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Fuzzy suggestions */}
      {fuzzySuggestions.length > 0 && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Wand2 className="h-4 w-4 text-primary" />
              Suggestions automatiques
              <Badge variant="secondary">{fuzzySuggestions.length}</Badge>
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Correspondances détectées par similarité. Vérifiez et acceptez les suggestions pertinentes.
            </p>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Catégorie Soft Carrier</TableHead>
                  <TableHead>→ Suggestion interne</TableHead>
                  <TableHead>Similarité</TableHead>
                  <TableHead className="w-28">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fuzzySuggestions.map((s, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium text-sm">{s.supplierCategoryName}</TableCell>
                    <TableCell>
                      <Badge className="bg-primary/10 text-primary">{s.matchedCategoryName}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={s.score * 100} className="w-16 h-2" />
                        <span className={`text-xs font-medium ${
                          s.score >= 0.8 ? "text-green-600" : s.score >= 0.6 ? "text-yellow-600" : "text-orange-600"
                        }`}>
                          {Math.round(s.score * 100)}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost" size="icon"
                          className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50"
                          onClick={() => acceptSuggestion(s)}
                          title="Accepter"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost" size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => setFuzzySuggestions(prev => prev.filter(x => x.supplierCategoryName !== s.supplierCategoryName))}
                          title="Ignorer"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
      {fuzzyRan && fuzzySuggestions.length === 0 && (
        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="py-4 text-center text-sm text-green-700 flex items-center justify-center gap-2">
            <Check className="h-4 w-4" />
            Toutes les catégories Soft Carrier sont mappées ou ont une correspondance exacte.
          </CardContent>
        </Card>
      )}

      {/* Existing mappings table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Mappings Soft Carrier existants</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Catégorie fournisseur</TableHead>
                <TableHead>Sous-catégorie</TableHead>
                <TableHead>→ Catégorie interne</TableHead>
                <TableHead>Vérifié</TableHead>
                <TableHead className="w-16">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mappingsLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : softMappings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Aucun mapping Soft Carrier configuré. Lancez la détection automatique ou créez-en manuellement.
                  </TableCell>
                </TableRow>
              ) : (
                softMappings.map(m => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium text-sm">{m.supplier_category_name}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{m.supplier_subcategory_name || '—'}</TableCell>
                    <TableCell>
                      <Badge className="bg-primary/10 text-primary">{m.category_name}</Badge>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={m.is_verified}
                        onCheckedChange={(v) => updateMapping(m.id, { is_verified: v })}
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost" size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={() => deleteMapping(m.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
