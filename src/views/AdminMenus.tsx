import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Menu, Plus, Trash2, Save, GripVertical, ChevronRight, ChevronDown,
  Eye, EyeOff, ExternalLink, Loader2, Pencil, ArrowUp, ArrowDown,
} from "lucide-react";
import { toast } from "sonner";
import {
  useAdminMenus, useCreateMenu, useUpdateMenu, useDeleteMenu,
  useCreateMenuItem, useUpdateMenuItem, useDeleteMenuItem, useReorderMenuItems,
  type NavigationMenu, type MenuItem,
} from "@/hooks/useNavigationMenus";

// ── Location labels ─────────────────────────────────────────────────────────────

const LOCATION_LABELS: Record<string, string> = {
  header: "Header",
  footer: "Footer",
  mega: "MegaMenu",
};

// ── Menu Item Editor Dialog ─────────────────────────────────────────────────────

function MenuItemDialog({
  open,
  item,
  menuId,
  parentOptions,
  onClose,
}: {
  open: boolean;
  item: MenuItem | null;
  menuId: string;
  parentOptions: MenuItem[];
  onClose: () => void;
}) {
  const isNew = item === null;
  const [label, setLabel] = useState(item?.label ?? "");
  const [url, setUrl] = useState(item?.url ?? "/");
  const [parentId, setParentId] = useState<string>(item?.parent_id ?? "none");
  const [isExternal, setIsExternal] = useState(item?.is_external ?? false);
  const [openInNewTab, setOpenInNewTab] = useState(item?.open_in_new_tab ?? false);
  const [isVisible, setIsVisible] = useState(item?.is_visible ?? true);
  const [cssClass, setCssClass] = useState(item?.css_class ?? "");
  const [imageUrl, setImageUrl] = useState(item?.image_url ?? "");

  const createItem = useCreateMenuItem();
  const updateItem = useUpdateMenuItem();

  const handleSave = async () => {
    if (!label.trim()) {
      toast.error("Le libellé est requis");
      return;
    }
    try {
      const payload = {
        label: label.trim(),
        url: url.trim() || "/",
        parent_id: parentId === "none" ? null : parentId,
        is_external: isExternal,
        open_in_new_tab: openInNewTab,
        is_visible: isVisible,
        css_class: cssClass.trim() || null,
        image_url: imageUrl.trim() || null,
      };

      if (isNew) {
        await createItem.mutateAsync({ ...payload, menu_id: menuId });
        toast.success("Élément ajouté");
      } else {
        await updateItem.mutateAsync({ id: item!.id, ...payload });
        toast.success("Élément mis à jour");
      }
      onClose();
    } catch (e) {
      toast.error("Erreur", { description: e instanceof Error ? e.message : String(e) });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isNew ? "Ajouter un élément" : "Modifier l'élément"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Libellé <span className="text-destructive">*</span></Label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Mon lien" />
          </div>

          <div className="space-y-1.5">
            <Label>URL</Label>
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="/page" />
          </div>

          <div className="space-y-1.5">
            <Label>Parent</Label>
            <Select value={parentId} onValueChange={setParentId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Racine —</SelectItem>
                {parentOptions.map((opt) => (
                  <SelectItem key={opt.id} value={opt.id}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Image URL <span className="text-xs text-muted-foreground">(optionnel)</span></Label>
            <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." />
          </div>

          <div className="space-y-1.5">
            <Label>Classe CSS <span className="text-xs text-muted-foreground">(optionnel)</span></Label>
            <Input value={cssClass} onChange={(e) => setCssClass(e.target.value)} placeholder="font-medium" />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="visible">Visible</Label>
            <Switch id="visible" checked={isVisible} onCheckedChange={setIsVisible} />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="external">Lien externe</Label>
            <Switch id="external" checked={isExternal} onCheckedChange={setIsExternal} />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="newtab">Ouvrir dans un nouvel onglet</Label>
            <Switch id="newtab" checked={openInNewTab} onCheckedChange={setOpenInNewTab} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={handleSave} disabled={createItem.isPending || updateItem.isPending} className="gap-2">
            {(createItem.isPending || updateItem.isPending) ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {isNew ? "Ajouter" : "Enregistrer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Menu Item Row (recursive for children) ──────────────────────────────────────

function MenuItemRow({
  item,
  depth,
  allItems,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: {
  item: MenuItem;
  depth: number;
  allItems: MenuItem[];
  onEdit: (item: MenuItem) => void;
  onDelete: (item: MenuItem) => void;
  onMoveUp: (item: MenuItem) => void;
  onMoveDown: (item: MenuItem) => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = item.children && item.children.length > 0;

  return (
    <div>
      <div
        className="flex items-center gap-2 px-3 py-2 border rounded-lg bg-card hover:bg-muted/30 transition-colors group"
        style={{ marginLeft: depth * 24 }}
      >
        <GripVertical className="h-4 w-4 text-muted-foreground/40 shrink-0" />

        {hasChildren ? (
          <button onClick={() => setExpanded(!expanded)} className="shrink-0">
            {expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          </button>
        ) : (
          <div className="w-4" />
        )}

        <span className={`flex-1 text-sm truncate ${!item.is_visible ? "text-muted-foreground line-through" : ""}`}>
          {item.label}
        </span>

        <span className="text-xs text-muted-foreground truncate max-w-[150px] hidden sm:block">
          {item.url}
        </span>

        {!item.is_visible && <EyeOff className="h-3 w-3 text-muted-foreground shrink-0" />}
        {item.is_external && <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0" />}

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onMoveUp(item)} disabled={isFirst}>
            <ArrowUp className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onMoveDown(item)} disabled={isLast}>
            <ArrowDown className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(item)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => onDelete(item)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {expanded && hasChildren && (
        <div className="mt-1 space-y-1">
          {item.children!.map((child, i) => (
            <MenuItemRow
              key={child.id}
              item={child}
              depth={depth + 1}
              allItems={allItems}
              onEdit={onEdit}
              onDelete={onDelete}
              onMoveUp={onMoveUp}
              onMoveDown={onMoveDown}
              isFirst={i === 0}
              isLast={i === item.children!.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Menu Editor Panel ───────────────────────────────────────────────────────────

function MenuEditor({ menu, onBack }: { menu: NavigationMenu; onBack: () => void }) {
  const [editingItem, setEditingItem] = useState<MenuItem | null | "new">(null);
  const [deletingItem, setDeletingItem] = useState<MenuItem | null>(null);

  const updateMenu = useUpdateMenu();
  const deleteItem = useDeleteMenuItem();
  const reorderItems = useReorderMenuItems();

  // Get flat list of root items for parent selector
  const rootItems = menu.items.filter((item) => !item.parent_id);

  // Flatten all items for reorder operations
  function flattenItems(items: MenuItem[]): MenuItem[] {
    const flat: MenuItem[] = [];
    for (const item of items) {
      flat.push(item);
      if (item.children?.length) flat.push(...flattenItems(item.children));
    }
    return flat;
  }
  const allFlat = flattenItems(menu.items);

  const handleMoveUp = async (item: MenuItem) => {
    const siblings = allFlat.filter((i) => i.parent_id === item.parent_id);
    const idx = siblings.findIndex((s) => s.id === item.id);
    if (idx <= 0) return;
    const prev = siblings[idx - 1];
    try {
      await reorderItems.mutateAsync([
        { id: item.id, sort_order: prev.sort_order },
        { id: prev.id, sort_order: item.sort_order },
      ]);
    } catch (e) {
      toast.error("Erreur réordonnancement", { description: e instanceof Error ? e.message : String(e) });
    }
  };

  const handleMoveDown = async (item: MenuItem) => {
    const siblings = allFlat.filter((i) => i.parent_id === item.parent_id);
    const idx = siblings.findIndex((s) => s.id === item.id);
    if (idx >= siblings.length - 1) return;
    const next = siblings[idx + 1];
    try {
      await reorderItems.mutateAsync([
        { id: item.id, sort_order: next.sort_order },
        { id: next.id, sort_order: item.sort_order },
      ]);
    } catch (e) {
      toast.error("Erreur réordonnancement", { description: e instanceof Error ? e.message : String(e) });
    }
  };

  const handleDeleteItem = async () => {
    if (!deletingItem) return;
    try {
      await deleteItem.mutateAsync(deletingItem.id);
      toast.success("Élément supprimé");
      setDeletingItem(null);
    } catch (e) {
      toast.error("Erreur suppression", { description: e instanceof Error ? e.message : String(e) });
    }
  };

  const handleToggleActive = async () => {
    try {
      await updateMenu.mutateAsync({ id: menu.id, is_active: !menu.is_active });
      toast.success(menu.is_active ? "Menu désactivé" : "Menu activé");
    } catch (e) {
      toast.error("Erreur", { description: e instanceof Error ? e.message : String(e) });
    }
  };

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}>← Retour</Button>
          <span className="text-muted-foreground">/</span>
          <span className="font-medium text-sm">{menu.label}</span>
          <Badge variant={menu.is_active ? "default" : "secondary"}>
            {menu.is_active ? "Actif" : "Inactif"}
          </Badge>
          <Badge variant="outline">{LOCATION_LABELS[menu.location] ?? menu.location}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleToggleActive}
            disabled={updateMenu.isPending}
            className="gap-1"
          >
            {menu.is_active ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            {menu.is_active ? "Désactiver" : "Activer"}
          </Button>
          <Button size="sm" onClick={() => setEditingItem("new")} className="gap-1">
            <Plus className="h-3.5 w-3.5" /> Ajouter un élément
          </Button>
        </div>
      </div>

      {/* Menu info */}
      <div className="grid grid-cols-3 gap-4 p-4 rounded-xl border bg-muted/30">
        <div>
          <p className="text-xs text-muted-foreground">Slug</p>
          <p className="text-sm font-mono">{menu.slug}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Emplacement</p>
          <p className="text-sm">{LOCATION_LABELS[menu.location] ?? menu.location}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Éléments</p>
          <p className="text-sm">{allFlat.length} élément(s)</p>
        </div>
      </div>

      {/* Items tree */}
      {menu.items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground border rounded-xl">
          <Menu className="h-10 w-10 mb-3 opacity-40" />
          <p className="font-medium">Aucun élément dans ce menu</p>
          <p className="text-sm mt-1">Ajoutez des liens de navigation</p>
          <Button className="mt-4 gap-2" onClick={() => setEditingItem("new")}>
            <Plus className="h-4 w-4" /> Ajouter un élément
          </Button>
        </div>
      ) : (
        <div className="space-y-1">
          {menu.items.map((item, i) => (
            <MenuItemRow
              key={item.id}
              item={item}
              depth={0}
              allItems={allFlat}
              onEdit={setEditingItem}
              onDelete={setDeletingItem}
              onMoveUp={handleMoveUp}
              onMoveDown={handleMoveDown}
              isFirst={i === 0}
              isLast={i === menu.items.length - 1}
            />
          ))}
        </div>
      )}

      {/* Edit / Create dialog */}
      {editingItem !== null && (
        <MenuItemDialog
          open
          item={editingItem === "new" ? null : editingItem}
          menuId={menu.id}
          parentOptions={rootItems}
          onClose={() => setEditingItem(null)}
        />
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deletingItem} onOpenChange={(v) => { if (!v) setDeletingItem(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer "{deletingItem?.label}" ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cet élément et ses sous-éléments seront supprimés définitivement.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={handleDeleteItem}>
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── Create Menu Dialog ──────────────────────────────────────────────────────────

function CreateMenuDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [slug, setSlug] = useState("");
  const [label, setLabel] = useState("");
  const [location, setLocation] = useState("header");
  const createMenu = useCreateMenu();

  const handleCreate = async () => {
    if (!slug.trim() || !label.trim()) {
      toast.error("Slug et libellé sont requis");
      return;
    }
    try {
      await createMenu.mutateAsync({
        slug: slug.trim().toLowerCase().replace(/\s+/g, "_"),
        label: label.trim(),
        location,
      });
      toast.success("Menu créé");
      onClose();
      setSlug(""); setLabel(""); setLocation("header");
    } catch (e) {
      toast.error("Erreur", { description: e instanceof Error ? e.message : String(e) });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Nouveau menu</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Libellé <span className="text-destructive">*</span></Label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Navigation principale" />
          </div>
          <div className="space-y-1.5">
            <Label>Slug <span className="text-destructive">*</span></Label>
            <Input
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, ""))}
              placeholder="header_nav"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Emplacement</Label>
            <Select value={location} onValueChange={setLocation}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="header">Header</SelectItem>
                <SelectItem value="footer">Footer</SelectItem>
                <SelectItem value="mega">MegaMenu</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={handleCreate} disabled={createMenu.isPending} className="gap-2">
            {createMenu.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Créer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────────

export default function AdminMenus() {
  const { data: menus, isLoading, error: loadError } = useAdminMenus();
  const [selectedMenu, setSelectedMenu] = useState<NavigationMenu | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [locationTab, setLocationTab] = useState("all");
  const deleteMenu = useDeleteMenu();
  const [deletingMenu, setDeletingMenu] = useState<NavigationMenu | null>(null);

  const filteredMenus = (menus ?? []).filter(
    (m) => locationTab === "all" || m.location === locationTab,
  );

  const handleDeleteMenu = async () => {
    if (!deletingMenu) return;
    try {
      await deleteMenu.mutateAsync(deletingMenu.id);
      toast.success("Menu supprimé");
      setDeletingMenu(null);
    } catch (e) {
      toast.error("Erreur suppression", { description: e instanceof Error ? e.message : String(e) });
    }
  };

  if (selectedMenu) {
    // Refresh the selected menu data from the latest query
    const freshMenu = menus?.find((m) => m.id === selectedMenu.id);
    return (
      <AdminLayout title="Menus" description="Gestion des menus de navigation">
        <MenuEditor
          menu={freshMenu ?? selectedMenu}
          onBack={() => setSelectedMenu(null)}
        />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Menus" description="Gestion des menus de navigation">
      <div className="space-y-6">
        {/* Actions */}
        <div className="flex items-center justify-between">
          <Tabs value={locationTab} onValueChange={setLocationTab}>
            <TabsList>
              <TabsTrigger value="all">Tous ({menus?.length ?? 0})</TabsTrigger>
              <TabsTrigger value="header">Header ({menus?.filter((m) => m.location === "header").length ?? 0})</TabsTrigger>
              <TabsTrigger value="footer">Footer ({menus?.filter((m) => m.location === "footer").length ?? 0})</TabsTrigger>
              <TabsTrigger value="mega">Mega ({menus?.filter((m) => m.location === "mega").length ?? 0})</TabsTrigger>
            </TabsList>
          </Tabs>

          <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Nouveau menu
          </Button>
        </div>

        {/* Error */}
        {loadError && (
          <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/5 text-sm text-destructive">
            Erreur de chargement : {(loadError as Error).message}
          </div>
        )}

        {/* Menu list */}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
          </div>
        ) : filteredMenus.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground border rounded-xl">
            <Menu className="h-10 w-10 mb-3 opacity-40" />
            <p className="font-medium">Aucun menu trouvé</p>
            <p className="text-sm mt-1">Créez un menu de navigation pour commencer</p>
            <Button className="mt-4 gap-2" onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4" /> Nouveau menu
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredMenus.map((menu) => {
              // Count all items recursively
              function countItems(items: MenuItem[]): number {
                return items.reduce((sum, item) => sum + 1 + countItems(item.children ?? []), 0);
              }
              const totalItems = countItems(menu.items);

              return (
                <button
                  key={menu.id}
                  onClick={() => setSelectedMenu(menu)}
                  className="w-full text-left border rounded-xl p-4 bg-card hover:border-primary/40 hover:bg-muted/30 transition-all duration-150 group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/5 group-hover:bg-primary/10 transition-colors shrink-0">
                        <Menu className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">{menu.label}</p>
                          <Badge variant={menu.is_active ? "default" : "secondary"} className="text-[10px]">
                            {menu.is_active ? "Actif" : "Inactif"}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground font-mono">{menu.slug}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <Badge variant="outline">{LOCATION_LABELS[menu.location] ?? menu.location}</Badge>
                      <span className="text-xs text-muted-foreground">{totalItems} élément(s)</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                        onClick={(e) => { e.stopPropagation(); setDeletingMenu(menu); }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <CreateMenuDialog open={showCreateDialog} onClose={() => setShowCreateDialog(false)} />

      {/* Delete menu confirmation */}
      <AlertDialog open={!!deletingMenu} onOpenChange={(v) => { if (!v) setDeletingMenu(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le menu "{deletingMenu?.label}" ?</AlertDialogTitle>
            <AlertDialogDescription>
              Ce menu et tous ses éléments seront supprimés définitivement.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={handleDeleteMenu}>
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
