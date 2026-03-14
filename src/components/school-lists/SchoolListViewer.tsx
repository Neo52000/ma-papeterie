import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ArrowLeft, ShoppingCart, FileText, AlertCircle, PlusCircle, ShoppingBag, Package, BookOpen, Calendar, GraduationCap } from 'lucide-react';
import { useSchoolLists, SchoolList, SchoolListItem } from '@/hooks/useSchoolLists';
import { School } from '@/hooks/useSchools';
import { Skeleton } from '@/components/ui/skeleton';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/hooks/use-toast';
import CreateListForm from './CreateListForm';
import ProductMatcher from './ProductMatcher';

interface SchoolListViewerProps {
  school: School;
  onBack: () => void;
}

const SchoolListViewer = ({ school, onBack }: SchoolListViewerProps) => {
  const { lists, loading, fetchListItems, refetch } = useSchoolLists(school.id);
  const [selectedList, setSelectedList] = useState<SchoolList | null>(null);
  const [listItems, setListItems] = useState<SchoolListItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const { state: cartState } = useCart();
  const { toast } = useToast();

  const loadListItems = useCallback(async (listId: string) => {
    setLoadingItems(true);
    try {
      const items = await fetchListItems(listId);
      setListItems(items);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les articles de la liste",
        variant: "destructive"
      });
    } finally {
      setLoadingItems(false);
    }
  }, [fetchListItems, toast]);

  useEffect(() => {
    if (selectedList) {
      loadListItems(selectedList.id);
    }
  }, [selectedList, loadListItems]);

  const getTotalEstimatedCost = () => {
    return listItems.length * 2.5; // Average price estimation
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

  if (showCreateForm) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => setShowCreateForm(false)} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Retour aux listes
        </Button>
        <CreateListForm 
          school={school} 
          onSuccess={() => {
            setShowCreateForm(false);
            refetch();
          }} 
        />
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
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="w-6 h-6 text-primary" />
                  {school.name}
                </CardTitle>
                <CardDescription className="capitalize mt-1">
                  {school.school_type} • {school.postal_code} {school.city}
                </CardDescription>
              </div>
              <Button onClick={() => setShowCreateForm(true)} className="gap-2">
                <PlusCircle className="w-4 h-4" />
                Créer une liste
              </Button>
            </div>
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
                      <h4 className="font-semibold flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-primary" />
                        {list.list_name}
                      </h4>
                      <p className="text-sm text-muted-foreground mt-1 flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <GraduationCap className="w-3 h-3" />
                          {list.class_level}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {list.school_year}
                        </span>
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
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            {selectedList.list_name}
          </CardTitle>
          <CardDescription>
            {school.name} • Classe : {selectedList.class_level} • Année : {selectedList.school_year}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 bg-accent/50 rounded-lg">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm font-medium">Articles dans la liste</p>
                <p className="text-xs text-muted-foreground">
                  {listItems.length} article{listItems.length > 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium">Coût estimé</p>
              <p className="text-lg font-bold text-primary">
                ~{getTotalEstimatedCost().toFixed(2)}€
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {loadingItems ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Articles à commander</CardTitle>
              <CardDescription>
                Sélectionnez les produits correspondants pour chaque article
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="space-y-3">
                {listItems.map((item) => (
                  <AccordionItem 
                    key={item.id} 
                    value={item.id} 
                    className="border rounded-lg px-4"
                  >
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center justify-between w-full pr-4">
                        <div className="flex items-center gap-3 text-left">
                          <Badge variant="secondary" className="text-xs font-medium">
                            {item.quantity}×
                          </Badge>
                          <div>
                            <p className="font-medium">{item.item_name}</p>
                            {item.description && (
                              <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                                {item.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {item.is_mandatory && (
                            <Badge variant="destructive" className="text-xs">
                              Obligatoire
                            </Badge>
                          )}
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-4 pb-2">
                      <ProductMatcher
                        itemName={item.item_name}
                        quantity={item.quantity}
                      />
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>

          {cartState.itemCount > 0 && (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium flex items-center gap-2">
                      <ShoppingBag className="w-4 h-4 text-primary" />
                      Panier en cours
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {cartState.itemCount} article{cartState.itemCount > 1 ? 's' : ''} • {cartState.total.toFixed(2)}€
                    </p>
                  </div>
                  <Button>
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    Voir le panier
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default SchoolListViewer;
