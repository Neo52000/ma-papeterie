import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useCategories, useSupplierCategoryMappings, Category, CategoryLevel } from "@/hooks/useCategories";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  FolderTree, Plus, Edit, Trash2, ChevronRight, ChevronDown,
  Search, Check, X, Link2, Package, Eye, EyeOff,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const LEVEL_LABELS: Record<CategoryLevel, string> = {
  famille: "Famille",
  sous_famille: "Sous-famille",
  categorie: "Catégorie",
  sous_categorie: "Sous-catégorie",
};

const LEVEL_COLORS: Record<CategoryLevel, string> = {
  famille: "bg-primary text-primary-foreground",
  sous_famille: "bg-secondary text-secondary-foreground",
  categorie: "bg-accent text-accent-foreground",
  sous_categorie: "bg-muted text-muted-foreground",
};

const CHILD_LEVEL: Record<CategoryLevel, CategoryLevel | null> = {
  famille: "sous_famille",
  sous_famille: "categorie",
  categorie: "sous_categorie",
  sous_categorie: null,
};

interface Supplier {
  id: string;
  name: string;
}

// ===== Category Tree Node =====
function CategoryNode({
  category,
  onEdit,
  onDelete,
  onAddChild,
  onToggleActive,
  productCounts,
  depth = 0,
}: {
  category: Category;
  onEdit: (c: Category) => void;
  onDelete: (c: Category) => void;
  onAddChild: (parent: Category) => void;
  onToggleActive: (c: Category) => void;
  productCounts: Record<string, number>;
  depth?: number;
}) {
  const [expanded, setExpanded] = useState(depth < 2);
  const hasChildren = category.children && category.children.length > 0;
  const childLevel = CHILD_LEVEL[category.level as CategoryLevel];
  const count = productCounts[category.name] || 0;

  return (
    <div>
      <div
        className="flex items-center gap-2 py-2 px-3 hover:bg-muted/50 rounded-lg group transition-colors"
        style={{ paddingLeft: `${depth * 24 + 12}px` }}
      >
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-5 h-5 flex items-center justify-center"
        >
          {hasChildren ? (
            expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
          ) : (
            <span className="w-4" />
          )}
        </button>

        <Badge variant="outline" className={`text-xs ${LEVEL_COLORS[category.level as CategoryLevel]}`}>
          {LEVEL_LABELS[category.level as CategoryLevel]}
        </Badge>

        <span className={`font-medium flex-1 ${!category.is_active ? "text-muted-foreground line-through" : ""}`}>
          {category.name}
        </span>

        {count > 0 && (
          <Badge variant="secondary" className="text-xs">
            <Package className="h-3 w-3 mr-1" />
            {count}
          </Badge>
        )}

        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onToggleActive(category)}>
            {category.is_active ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
          </Button>
          {childLevel && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onAddChild(category)}>
              <Plus className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(category)}>
            <Edit className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDelete(category)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {expanded && hasChildren && (
        <div>
          {category.children!.map((child) => (
            <CategoryNode
              key={child.id}
              category={child}
              onEdit={onEdit}
              onDelete={onDelete}
              onAddChild={onAddChild}
              onToggleActive={onToggleActive}
              productCounts={productCounts}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ===== Main Page =====
export default function AdminCategories() {
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { categories, tree, loading, createCategory, updateCategory, deleteCategory } = useCategories();
  const { mappings, loading: mappingsLoading, createMapping, updateMapping, deleteMapping } = useSupplierCategoryMappings();

  const [search, setSearch] = useState("");
  const [editDialog, setEditDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formName, setFormName] = useState("");
  const [formLevel, setFormLevel] = useState<CategoryLevel>("famille");
  const [formParentId, setFormParentId] = useState<string | null>(null);
  const [formDescription, setFormDescription] = useState("");
  const [formImageUrl, setFormImageUrl] = useState("");

  // Mapping form state
  const [mappingDialog, setMappingDialog] = useState(false);
  const [mappingCategoryId, setMappingCategoryId] = useState("");
  const [mappingSupplierId, setMappingSupplierId] = useState("");
  const [mappingSupplierCatName, setMappingSupplierCatName] = useState("");
  const [mappingSupplierSubcatName, setMappingSupplierSubcatName] = useState("");

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [productCounts, setProductCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) navigate("/auth");
  }, [authLoading, user, isAdmin, navigate]);

  useEffect(() => {
    const fetchSuppliers = async () => {
      const { data } = await supabase.from("suppliers").select("id, name").order("name");
      if (data) setSuppliers(data);
    };
    const fetchProductCounts = async () => {
      const { data } = await supabase.from("products").select("category");
      if (data) {
        const counts: Record<string, number> = {};
        data.forEach((p: any) => {
          if (p.category) counts[p.category] = (counts[p.category] || 0) + 1;
        });
        setProductCounts(counts);
      }
    };
    fetchSuppliers();
    fetchProductCounts();
  }, []);

  // Filter tree by search
  const filteredTree = useMemo(() => {
    if (!search.trim()) return tree;
    const term = search.toLowerCase();
    const matchIds = new Set<string>();

    // find all matching categories and their ancestors
    const findMatches = (cats: Category[]) => {
      cats.forEach(c => {
        if (c.name.toLowerCase().includes(term)) {
          matchIds.add(c.id);
          // Add all ancestors
          let parent = categories.find(p => p.id === c.parent_id);
          while (parent) {
            matchIds.add(parent.id);
            parent = categories.find(p => p.id === parent!.parent_id);
          }
        }
        if (c.children) findMatches(c.children);
      });
    };
    findMatches(tree);

    const filterTree = (nodes: Category[]): Category[] => {
      return nodes
        .filter(n => matchIds.has(n.id))
        .map(n => ({ ...n, children: n.children ? filterTree(n.children) : [] }));
    };
    return filterTree(tree);
  }, [tree, search, categories]);

  const openCreateDialog = (level: CategoryLevel, parentId: string | null = null) => {
    setEditingCategory(null);
    setFormName("");
    setFormLevel(level);
    setFormParentId(parentId);
    setFormDescription("");
    setFormImageUrl("");
    setEditDialog(true);
  };

  const openEditDialog = (cat: Category) => {
    setEditingCategory(cat);
    setFormName(cat.name);
    setFormLevel(cat.level as CategoryLevel);
    setFormParentId(cat.parent_id);
    setFormDescription(cat.description || "");
    setFormImageUrl(cat.image_url || "");
    setEditDialog(true);
  };

  const handleSaveCategory = async () => {
    if (!formName.trim()) return;
    if (editingCategory) {
      await updateCategory(editingCategory.id, {
        name: formName,
        description: formDescription || null,
        image_url: formImageUrl || null,
      });
    } else {
      await createCategory({
        name: formName,
        level: formLevel,
        parent_id: formParentId,
        description: formDescription || undefined,
        image_url: formImageUrl || undefined,
      });
    }
    setEditDialog(false);
  };

  const handleDelete = async (cat: Category) => {
    const children = categories.filter(c => c.parent_id === cat.id);
    if (children.length > 0) {
      toast({
        title: "Impossible",
        description: `Cette catégorie a ${children.length} enfant(s). Supprimez-les d'abord.`,
        variant: "destructive",
      });
      return;
    }
    if (confirm(`Supprimer "${cat.name}" ?`)) {
      await deleteCategory(cat.id);
    }
  };

  const handleToggleActive = async (cat: Category) => {
    await updateCategory(cat.id, { is_active: !cat.is_active });
  };

  const handleAddChild = (parent: Category) => {
    const childLevel = CHILD_LEVEL[parent.level as CategoryLevel];
    if (childLevel) openCreateDialog(childLevel, parent.id);
  };

  // Mapping handlers
  const openMappingDialog = () => {
    setMappingCategoryId("");
    setMappingSupplierId("");
    setMappingSupplierCatName("");
    setMappingSupplierSubcatName("");
    setMappingDialog(true);
  };

  const handleSaveMapping = async () => {
    if (!mappingCategoryId || !mappingSupplierId || !mappingSupplierCatName.trim()) return;
    await createMapping({
      category_id: mappingCategoryId,
      supplier_id: mappingSupplierId,
      supplier_category_name: mappingSupplierCatName,
      supplier_subcategory_name: mappingSupplierSubcatName || undefined,
    });
    setMappingDialog(false);
  };

  const handleVerifyMapping = async (id: string, verified: boolean) => {
    await updateMapping(id, { is_verified: verified });
  };

  // Enrich mappings with supplier/category names
  const enrichedMappings = useMemo(() => {
    return mappings.map(m => ({
      ...m,
      supplier_name: suppliers.find(s => s.id === m.supplier_id)?.name || "Inconnu",
      category_name: categories.find(c => c.id === m.category_id)?.name || "Inconnue",
    }));
  }, [mappings, suppliers, categories]);

  if (authLoading || !user || !isAdmin) return null;

  return (
    <AdminLayout title="Gestion des Catégories" description="Hiérarchie et mappings fournisseurs">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <FolderTree className="h-8 w-8 text-primary" />
              Gestion des Catégories
            </h1>
            <p className="text-muted-foreground mt-1">
              {categories.length} catégories • Hiérarchie Famille → Sous-famille → Catégorie → Sous-catégorie
            </p>
          </div>
        </div>

        <Tabs defaultValue="tree">
          <TabsList>
            <TabsTrigger value="tree">Arborescence</TabsTrigger>
            <TabsTrigger value="mappings">
              Mappings Fournisseurs
              <Badge variant="secondary" className="ml-2">{mappings.length}</Badge>
            </TabsTrigger>
          </TabsList>

          {/* ===== TAB: Tree ===== */}
          <TabsContent value="tree" className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher une catégorie..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button onClick={() => openCreateDialog("famille")}>
                <Plus className="h-4 w-4 mr-2" />
                Famille
              </Button>
              <Button variant="outline" onClick={() => openCreateDialog("categorie")}>
                <Plus className="h-4 w-4 mr-2" />
                Catégorie
              </Button>
            </div>

            <Card>
              <CardContent className="p-2">
                {loading ? (
                  <div className="p-8 text-center text-muted-foreground">Chargement...</div>
                ) : filteredTree.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    {search ? "Aucune catégorie ne correspond" : "Aucune catégorie. Créez une famille pour commencer."}
                  </div>
                ) : (
                  filteredTree.map((cat) => (
                    <CategoryNode
                      key={cat.id}
                      category={cat}
                      onEdit={openEditDialog}
                      onDelete={handleDelete}
                      onAddChild={handleAddChild}
                      onToggleActive={handleToggleActive}
                      productCounts={productCounts}
                    />
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===== TAB: Mappings ===== */}
          <TabsContent value="mappings" className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Associez les noms de catégories fournisseurs à vos catégories internes
              </p>
              <Button onClick={openMappingDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Nouveau mapping
              </Button>
            </div>

            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fournisseur</TableHead>
                      <TableHead>Catégorie fournisseur</TableHead>
                      <TableHead>Sous-cat. fournisseur</TableHead>
                      <TableHead>→ Catégorie interne</TableHead>
                      <TableHead>Vérifié</TableHead>
                      <TableHead className="w-20">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mappingsLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">Chargement...</TableCell>
                      </TableRow>
                    ) : enrichedMappings.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          Aucun mapping configuré
                        </TableCell>
                      </TableRow>
                    ) : (
                      enrichedMappings.map((m) => (
                        <TableRow key={m.id}>
                          <TableCell>
                            <Badge variant="outline">{m.supplier_name}</Badge>
                          </TableCell>
                          <TableCell className="font-medium">{m.supplier_category_name}</TableCell>
                          <TableCell className="text-muted-foreground">{m.supplier_subcategory_name || "—"}</TableCell>
                          <TableCell>
                            <Badge className="bg-primary/10 text-primary">{m.category_name}</Badge>
                          </TableCell>
                          <TableCell>
                            <Switch
                              checked={m.is_verified}
                              onCheckedChange={(v) => handleVerifyMapping(m.id, v)}
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
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
          </TabsContent>
        </Tabs>

        {/* ===== Category Dialog ===== */}
        <Dialog open={editDialog} onOpenChange={setEditDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingCategory ? `Modifier "${editingCategory.name}"` : `Nouvelle ${LEVEL_LABELS[formLevel]}`}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Nom *</Label>
                <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Nom de la catégorie" />
              </div>
              {!editingCategory && (
                <>
                  <div>
                    <Label>Niveau</Label>
                    <Select value={formLevel} onValueChange={(v) => setFormLevel(v as CategoryLevel)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(LEVEL_LABELS).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {formLevel !== "famille" && (
                    <div>
                      <Label>Parent</Label>
                      <Select value={formParentId || ""} onValueChange={setFormParentId}>
                        <SelectTrigger><SelectValue placeholder="Sélectionner un parent" /></SelectTrigger>
                        <SelectContent>
                          {categories
                            .filter(c => {
                              if (formLevel === "sous_famille") return c.level === "famille";
                              if (formLevel === "categorie") return c.level === "sous_famille" || c.level === "famille";
                              if (formLevel === "sous_categorie") return c.level === "categorie";
                              return false;
                            })
                            .map(c => (
                              <SelectItem key={c.id} value={c.id}>
                                {LEVEL_LABELS[c.level as CategoryLevel]}: {c.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </>
              )}
              <div>
                <Label>Description</Label>
                <Textarea value={formDescription} onChange={(e) => setFormDescription(e.target.value)} rows={2} />
              </div>
              <div>
                <Label>URL Image</Label>
                <Input value={formImageUrl} onChange={(e) => setFormImageUrl(e.target.value)} placeholder="https://..." />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialog(false)}>Annuler</Button>
              <Button onClick={handleSaveCategory} disabled={!formName.trim()}>
                {editingCategory ? "Mettre à jour" : "Créer"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ===== Mapping Dialog ===== */}
        <Dialog open={mappingDialog} onOpenChange={setMappingDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nouveau mapping fournisseur</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Fournisseur *</Label>
                <Select value={mappingSupplierId} onValueChange={setMappingSupplierId}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner un fournisseur" /></SelectTrigger>
                  <SelectContent>
                    {suppliers.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Nom catégorie chez le fournisseur *</Label>
                <Input
                  value={mappingSupplierCatName}
                  onChange={(e) => setMappingSupplierCatName(e.target.value)}
                  placeholder="Ex: STYLOS-BILLES"
                />
              </div>
              <div>
                <Label>Sous-catégorie fournisseur (optionnel)</Label>
                <Input
                  value={mappingSupplierSubcatName}
                  onChange={(e) => setMappingSupplierSubcatName(e.target.value)}
                  placeholder="Ex: ECRITURE BILLE"
                />
              </div>
              <div>
                <Label>Catégorie interne *</Label>
                <Select value={mappingCategoryId} onValueChange={setMappingCategoryId}>
                  <SelectTrigger><SelectValue placeholder="Associer à une catégorie interne" /></SelectTrigger>
                  <SelectContent>
                    {categories.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        [{LEVEL_LABELS[c.level as CategoryLevel]}] {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setMappingDialog(false)}>Annuler</Button>
              <Button
                onClick={handleSaveMapping}
                disabled={!mappingCategoryId || !mappingSupplierId || !mappingSupplierCatName.trim()}
              >
                Créer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
