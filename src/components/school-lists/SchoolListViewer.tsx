import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, ShoppingCart, FileText, AlertCircle } from 'lucide-react';
import { useSchoolLists, SchoolList, SchoolListItem } from '@/hooks/useSchoolLists';
import { School } from '@/hooks/useSchools';
import { Skeleton } from '@/components/ui/skeleton';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';

interface SchoolListViewerProps {
  school: School;
  onBack: () => void;
}

const SchoolListViewer = ({ school, onBack }: SchoolListViewerProps) => {
  const { lists, loading, fetchListItems } = useSchoolLists(school.id);
  const [selectedList, setSelectedList] = useState<SchoolList | null>(null);
  const [listItems, setListItems] = useState<SchoolListItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [loadingItems, setLoadingItems] = useState(false);
  const { addToCart } = useCart();
  const { toast } = useToast();

  useEffect(() => {
    if (selectedList) {
      loadListItems(selectedList.id);
    }
  }, [selectedList]);

  const loadListItems = async (listId: string) => {
    setLoadingItems(true);
    try {
      const items = await fetchListItems(listId);
      setListItems(items);
      setSelectedItems(new Set(items.map(item => item.id)));
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les articles de la liste",
        variant: "destructive"
      });
    } finally {
      setLoadingItems(false);
    }
  };

  const toggleItem = (itemId: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  const calculateTotal = () => {
    // Pour le MVP, on affiche un prix estimatif
    const selectedCount = selectedItems.size;
    return selectedCount * 3.5; // Prix moyen estimé
  };

  const handleAddToCart = () => {
    const selectedListItems = listItems.filter(item => selectedItems.has(item.id));
    
    if (selectedListItems.length === 0) {
      toast({
        title: "Attention",
        description: "Veuillez sélectionner au moins un article",
        variant: "destructive"
      });
      return;
    }

    // Pour le MVP, on affiche un message informatif
    toast({
      title: "Fonctionnalité en développement",
      description: `${selectedListItems.length} article(s) sélectionné(s). La correspondance automatique avec les produits sera disponible dans la Phase 2.`,
    });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!selectedList) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Retour à la recherche
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>{school.name}</CardTitle>
            <CardDescription className="capitalize">
              {school.school_type} - {school.postal_code} {school.city}
            </CardDescription>
          </CardHeader>
        </Card>

        {lists.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center space-y-4">
              <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto" />
              <div>
                <p className="font-semibold mb-2">Aucune liste disponible</p>
                <p className="text-sm text-muted-foreground">
                  Il n'y a pas encore de liste scolaire pour cet établissement.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">
              Listes scolaires disponibles ({lists.length})
            </h3>
            {lists.map((list) => (
              <Card
                key={list.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelectedList(list)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold">{list.list_name}</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Classe : {list.class_level} • Année : {list.school_year}
                      </p>
                    </div>
                    <Badge variant="outline">
                      <FileText className="w-3 h-3 mr-1" />
                      Active
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => setSelectedList(null)} className="gap-2">
        <ArrowLeft className="w-4 h-4" />
        Retour aux listes
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>{selectedList.list_name}</CardTitle>
          <CardDescription>
            {school.name} • Classe : {selectedList.class_level} • Année : {selectedList.school_year}
          </CardDescription>
        </CardHeader>
      </Card>

      {loadingItems ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Articles de la liste</CardTitle>
              <CardDescription>
                Sélectionnez les articles que vous souhaitez commander
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {listItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                >
                  <Checkbox
                    checked={selectedItems.has(item.id)}
                    onCheckedChange={() => toggleItem(item.id)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{item.item_name}</p>
                        {item.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {item.description}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <Badge variant={item.is_mandatory ? "default" : "secondary"}>
                          {item.is_mandatory ? "Obligatoire" : "Facultatif"}
                        </Badge>
                        <p className="text-sm text-muted-foreground mt-1">
                          Quantité : {item.quantity}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center text-lg">
                  <span className="font-semibold">Articles sélectionnés :</span>
                  <span>{selectedItems.size} / {listItems.length}</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center text-xl font-bold">
                  <span>Total estimé :</span>
                  <span className="text-primary">{calculateTotal().toFixed(2)} €</span>
                </div>
                <Button
                  onClick={handleAddToCart}
                  className="w-full"
                  size="lg"
                  disabled={selectedItems.size === 0}
                >
                  <ShoppingCart className="w-5 h-5 mr-2" />
                  Préparer ma commande
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  Le prix final sera calculé lors de la correspondance avec nos produits
                </p>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default SchoolListViewer;
