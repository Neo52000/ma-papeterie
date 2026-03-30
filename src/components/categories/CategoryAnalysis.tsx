import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  BarChart3, Loader2, FolderX, Copy, Package, RefreshCw,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AnalysisSummary {
  total_products: number;
  total_categories: number;
  active_categories: number;
  empty_categories: number;
  uncategorized_products: number;
  products_without_category_id: number;
  potential_duplicates: number;
  level_distribution: Record<string, number>;
}

interface EmptyCategory {
  id: string;
  name: string;
  level: string;
  has_children: boolean;
}

interface DuplicatePair {
  a: { id: string; name: string; level: string; product_count?: number };
  b: { id: string; name: string; level: string; product_count?: number };
  score: number;
}

interface TopCategory {
  id: string;
  name: string;
  level: string;
  product_count: number;
  is_active: boolean;
}

interface AnalysisResult {
  summary: AnalysisSummary;
  empty_categories: EmptyCategory[];
  potential_duplicates: DuplicatePair[];
  top_categories: TopCategory[];
}

const LEVEL_LABELS: Record<string, string> = {
  famille: "Famille",
  sous_famille: "Sous-famille",
  categorie: "Catégorie",
  sous_categorie: "Sous-catégorie",
};

const LEVEL_COLORS: Record<string, string> = {
  famille: "bg-blue-100 text-blue-800",
  sous_famille: "bg-purple-100 text-purple-800",
  categorie: "bg-green-100 text-green-800",
  sous_categorie: "bg-orange-100 text-orange-800",
};

export function CategoryAnalysis() {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);

  const runAnalysis = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("optimize-categories", {
        body: { action: "analyze", min_similarity: 0.6 },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setAnalysis(data as AnalysisResult);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  if (!analysis && !loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center space-y-4">
          <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground" />
          <div>
            <h3 className="text-lg font-medium">Analyse des catégories</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Identifiez les catégories vides, doublons potentiels et produits non classés.
            </p>
          </div>
          <Button onClick={runAnalysis}>
            <BarChart3 className="h-4 w-4 mr-2" />
            Lancer l'analyse
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Loader2 className="h-8 w-8 mx-auto animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Analyse en cours...</p>
        </CardContent>
      </Card>
    );
  }

  if (!analysis) return null;
  const { summary } = analysis;

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Résultats de l'analyse</h3>
        <Button variant="outline" size="sm" onClick={runAnalysis}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualiser
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Catégories actives"
          value={summary.active_categories}
          subtitle={`/ ${summary.total_categories} total`}
        />
        <StatCard
          label="Produits actifs"
          value={summary.total_products}
        />
        <StatCard
          label="Catégories vides"
          value={summary.empty_categories}
          variant={summary.empty_categories > 0 ? "warning" : "success"}
        />
        <StatCard
          label="Produits non classés"
          value={summary.products_without_category_id}
          variant={summary.products_without_category_id > 0 ? "warning" : "success"}
        />
      </div>

      {/* Level distribution */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Distribution par niveau</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            {Object.entries(summary.level_distribution).map(([level, count]) => (
              <div key={level} className="flex items-center gap-2">
                <Badge className={LEVEL_COLORS[level] || "bg-gray-100 text-gray-800"}>
                  {LEVEL_LABELS[level] || level}
                </Badge>
                <span className="text-sm font-medium">{count}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Top categories */}
      {analysis.top_categories.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Package className="h-4 w-4" />
              Top catégories par nombre de produits
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Catégorie</TableHead>
                  <TableHead>Niveau</TableHead>
                  <TableHead className="text-right">Produits</TableHead>
                  <TableHead className="w-40">Part</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analysis.top_categories.map((cat) => {
                  const pct = summary.total_products > 0
                    ? Math.round((cat.product_count / summary.total_products) * 100)
                    : 0;
                  return (
                    <TableRow key={cat.id}>
                      <TableCell className="font-medium">{cat.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {LEVEL_LABELS[cat.level] || cat.level}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">{cat.product_count}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={pct} className="h-1.5 flex-1" />
                          <span className="text-xs text-muted-foreground w-8">{pct}%</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Empty categories */}
      {analysis.empty_categories.length > 0 && (
        <Card className="border-amber-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-amber-700">
              <FolderX className="h-4 w-4" />
              Catégories vides ({analysis.empty_categories.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {analysis.empty_categories.map((cat) => (
                <Badge key={cat.id} variant="outline" className="text-amber-700 border-amber-300">
                  {cat.name}
                  <span className="ml-1 text-xs opacity-60">
                    ({LEVEL_LABELS[cat.level] || cat.level})
                  </span>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Potential duplicates */}
      {analysis.potential_duplicates.length > 0 && (
        <Card className="border-orange-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-orange-700">
              <Copy className="h-4 w-4" />
              Doublons potentiels ({analysis.potential_duplicates.length})
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Catégories de même niveau avec des noms similaires. Envisagez de les fusionner.
            </p>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Catégorie A</TableHead>
                  <TableHead>Catégorie B</TableHead>
                  <TableHead>Niveau</TableHead>
                  <TableHead>Similarité</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analysis.potential_duplicates.map((dup, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{dup.a.name}</TableCell>
                    <TableCell className="font-medium">{dup.b.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {LEVEL_LABELS[dup.a.level] || dup.a.level}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={dup.score * 100} className="w-16 h-2" />
                        <span className={`text-xs font-medium ${
                          dup.score >= 0.8 ? "text-red-600" : "text-orange-600"
                        }`}>
                          {Math.round(dup.score * 100)}%
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* All good */}
      {analysis.empty_categories.length === 0 &&
       analysis.potential_duplicates.length === 0 &&
       summary.products_without_category_id === 0 && (
        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="py-6 text-center text-green-700">
            L'arborescence des catégories est bien structurée. Aucun problème détecté.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  subtitle,
  variant = "default",
}: {
  label: string;
  value: number;
  subtitle?: string;
  variant?: "default" | "warning" | "success";
}) {
  const colors = {
    default: "",
    warning: "border-amber-200 bg-amber-50/50",
    success: "border-green-200 bg-green-50/50",
  };

  return (
    <Card className={colors[variant]}>
      <CardContent className="pt-4 pb-3">
        <div className="text-2xl font-bold">{value.toLocaleString()}</div>
        <div className="text-xs text-muted-foreground mt-0.5">
          {label}
          {subtitle && <span className="ml-1 opacity-70">{subtitle}</span>}
        </div>
      </CardContent>
    </Card>
  );
}
