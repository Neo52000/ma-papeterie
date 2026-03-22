import { memo } from "react";
import { X, ArrowRightLeft, Trash2, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { useCompareStore } from "@/stores/compareStore";

export const CompareFloatingBar = memo(function CompareFloatingBar() {
  const { items, isOpen, setOpen, remove, clear } = useCompareStore();

  if (items.length === 0) return null;

  return (
    <div className="fixed bottom-16 md:bottom-4 left-1/2 -translate-x-1/2 z-30 animate-slide-up">
      <Sheet open={isOpen} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button className="gap-2 shadow-lg rounded-full px-6" size="lg">
            <ArrowRightLeft className="h-4 w-4" />
            Comparer ({items.length})
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-2xl">
          <SheetHeader>
            <SheetTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <ArrowRightLeft className="h-5 w-5" />
                Comparateur ({items.length}/4)
              </span>
              <Button variant="ghost" size="sm" onClick={clear} className="text-muted-foreground">
                <Trash2 className="h-4 w-4 mr-1" /> Tout retirer
              </Button>
            </SheetTitle>
          </SheetHeader>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[600px] text-sm">
              <thead>
                <tr>
                  <th className="text-left p-2 text-muted-foreground font-medium w-28">Produit</th>
                  {items.map((p) => (
                    <th key={p.id} className="p-2 text-center min-w-[150px]">
                      <div className="relative">
                        <button
                          onClick={() => remove(p.id)}
                          className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                        <div className="bg-white rounded-lg p-2 aspect-square flex items-center justify-center mb-2 border">
                          {p.image_url ? (
                            <img src={p.image_url} alt={p.name} className="max-w-full max-h-16 object-contain" loading="lazy" decoding="async" />
                          ) : (
                            <Package className="h-8 w-8 text-muted-foreground/30" />
                          )}
                        </div>
                        <p className="font-semibold text-xs line-clamp-2">{p.name}</p>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr>
                  <td className="p-2 text-muted-foreground font-medium">Prix</td>
                  {items.map((p) => (
                    <td key={p.id} className="p-2 text-center font-bold text-primary">
                      {(p.price_ttc ?? p.price).toFixed(2)} €
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="p-2 text-muted-foreground font-medium">Catégorie</td>
                  {items.map((p) => (
                    <td key={p.id} className="p-2 text-center">
                      <Badge variant="outline" className="text-xs">{p.category}</Badge>
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="p-2 text-muted-foreground font-medium">Marque</td>
                  {items.map((p) => (
                    <td key={p.id} className="p-2 text-center text-xs">{p.brand ?? "—"}</td>
                  ))}
                </tr>
                <tr>
                  <td className="p-2 text-muted-foreground font-medium">Stock</td>
                  {items.map((p) => (
                    <td key={p.id} className="p-2 text-center">
                      <span className={`inline-flex items-center gap-1 text-xs ${(p.stock_quantity ?? 0) > 0 ? "text-green-600" : "text-destructive"}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${(p.stock_quantity ?? 0) > 0 ? "bg-green-500" : "bg-destructive"}`} />
                        {(p.stock_quantity ?? 0) > 0 ? "En stock" : "Rupture"}
                      </span>
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="p-2 text-muted-foreground font-medium">Description</td>
                  {items.map((p) => (
                    <td key={p.id} className="p-2 text-center text-xs text-muted-foreground line-clamp-3">
                      {p.description ?? "—"}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
});
