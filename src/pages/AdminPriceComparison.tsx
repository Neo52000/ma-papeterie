import { useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  RefreshCw, 
  Plus, 
  Trash2, 
  ExternalLink, 
  AlertCircle, 
  CheckCircle,
  Clock,
  Search,
  Package,
  Store
} from 'lucide-react';
import { 
  useCompetitors, 
  useCompetitorProductMaps, 
  useScrapeRuns, 
  useTriggerScrape,
  useUpsertCompetitorMap,
  useDeleteCompetitorMap,
  useToggleCompetitor,
} from '@/hooks/usePriceComparison';
import { useProducts } from '@/hooks/useProducts';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function AdminPriceComparison() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [selectedCompetitorId, setSelectedCompetitorId] = useState<string>('');
  const [productUrl, setProductUrl] = useState('');
  const [packSize, setPackSize] = useState('1');

  const { data: competitors, isLoading: loadingCompetitors } = useCompetitors();
  const { data: mappings, isLoading: loadingMappings } = useCompetitorProductMaps();
  const { data: scrapeRuns, isLoading: loadingRuns } = useScrapeRuns(20);
  const { products } = useProducts();
  
  const triggerScrape = useTriggerScrape();
  const upsertMapping = useUpsertCompetitorMap();
  const deleteMapping = useDeleteCompetitorMap();
  const toggleCompetitor = useToggleCompetitor();

  const filteredMappings = mappings?.filter(m => 
    m.product?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.competitor?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddMapping = () => {
    if (!selectedProductId || !selectedCompetitorId || !productUrl) return;

    upsertMapping.mutate({
      product_id: selectedProductId,
      competitor_id: selectedCompetitorId,
      product_url: productUrl,
      pack_size: parseInt(packSize),
      active: true,
    }, {
      onSuccess: () => {
        setIsAddDialogOpen(false);
        setSelectedProductId('');
        setSelectedCompetitorId('');
        setProductUrl('');
        setPackSize('1');
      }
    });
  };

  const handleForceRefresh = () => {
    triggerScrape.mutate({ force: true });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-100 text-green-800">Succès</Badge>;
      case 'partial':
        return <Badge className="bg-yellow-100 text-yellow-800">Partiel</Badge>;
      case 'fail':
        return <Badge variant="destructive">Échec</Badge>;
      case 'running':
        return <Badge className="bg-blue-100 text-blue-800">En cours</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <AdminLayout 
      title="Comparateur de Prix" 
      description="Gestion du scraping et suivi des prix concurrents"
    >
      <Tabs defaultValue="mappings" className="space-y-6">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="mappings" className="gap-2">
              <Package className="h-4 w-4" />
              URLs Concurrents
            </TabsTrigger>
            <TabsTrigger value="competitors" className="gap-2">
              <Store className="h-4 w-4" />
              Concurrents
            </TabsTrigger>
            <TabsTrigger value="runs" className="gap-2">
              <Clock className="h-4 w-4" />
              Historique Scraping
            </TabsTrigger>
          </TabsList>

          <Button 
            onClick={handleForceRefresh} 
            disabled={triggerScrape.isPending}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${triggerScrape.isPending ? 'animate-spin' : ''}`} />
            Forcer le scraping
          </Button>
        </div>

        {/* Tab: Mappings produits-concurrents */}
        <TabsContent value="mappings" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>URLs des Produits Concurrents</CardTitle>
                  <CardDescription>
                    Gérez les URLs à scraper pour chaque produit et concurrent
                  </CardDescription>
                </div>
                
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Ajouter une URL
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Ajouter une URL concurrente</DialogTitle>
                      <DialogDescription>
                        Liez un produit à une URL chez un concurrent
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Produit</Label>
                        <Select 
                          value={selectedProductId} 
                          onValueChange={setSelectedProductId}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner un produit" />
                          </SelectTrigger>
                          <SelectContent>
                            {products?.map(product => (
                              <SelectItem key={product.id} value={product.id}>
                                {product.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Concurrent</Label>
                        <Select 
                          value={selectedCompetitorId} 
                          onValueChange={setSelectedCompetitorId}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner un concurrent" />
                          </SelectTrigger>
                          <SelectContent>
                            {competitors?.filter(c => c.enabled).map(competitor => (
                              <SelectItem key={competitor.id} value={competitor.id}>
                                {competitor.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>URL du produit</Label>
                        <Input
                          placeholder="https://concurrent.fr/produit/..."
                          value={productUrl}
                          onChange={(e) => setProductUrl(e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Taille du lot</Label>
                        <Select value={packSize} onValueChange={setPackSize}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">Unité (1)</SelectItem>
                            <SelectItem value="5">Carton (5)</SelectItem>
                            <SelectItem value="10">Carton (10)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <DialogFooter>
                      <Button 
                        variant="outline" 
                        onClick={() => setIsAddDialogOpen(false)}
                      >
                        Annuler
                      </Button>
                      <Button 
                        onClick={handleAddMapping}
                        disabled={!selectedProductId || !selectedCompetitorId || !productUrl}
                      >
                        Ajouter
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="flex items-center gap-2 mt-4">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par produit ou concurrent..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-sm"
                />
              </div>
            </CardHeader>
            
            <CardContent>
              {loadingMappings ? (
                <div className="space-y-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produit</TableHead>
                      <TableHead>Concurrent</TableHead>
                      <TableHead>URL</TableHead>
                      <TableHead>Pack</TableHead>
                      <TableHead>Dernier succès</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMappings?.map((mapping) => (
                      <TableRow key={mapping.id}>
                        <TableCell className="font-medium">
                          {mapping.product?.name || 'Produit inconnu'}
                        </TableCell>
                        <TableCell>
                          {mapping.competitor?.name || 'Concurrent inconnu'}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          <a
                            href={mapping.product_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline flex items-center gap-1"
                          >
                            <span className="truncate">{mapping.product_url}</span>
                            <ExternalLink className="h-3 w-3 flex-shrink-0" />
                          </a>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">x{mapping.pack_size}</Badge>
                        </TableCell>
                        <TableCell>
                          {mapping.last_success_at ? (
                            <span className="text-sm text-muted-foreground">
                              {formatDistanceToNow(new Date(mapping.last_success_at), { 
                                addSuffix: true,
                                locale: fr 
                              })}
                            </span>
                          ) : (
                            <span className="text-sm text-muted-foreground">Jamais</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {mapping.last_error ? (
                            <Badge variant="destructive" className="gap-1">
                              <AlertCircle className="h-3 w-3" />
                              Erreur
                            </Badge>
                          ) : mapping.active ? (
                            <Badge className="bg-green-100 text-green-800 gap-1">
                              <CheckCircle className="h-3 w-3" />
                              Actif
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Inactif</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteMapping.mutate(mapping.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {filteredMappings?.length === 0 && !loadingMappings && (
                <div className="text-center py-8 text-muted-foreground">
                  Aucun mapping trouvé
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Concurrents */}
        <TabsContent value="competitors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Concurrents</CardTitle>
              <CardDescription>
                Activez ou désactivez les concurrents à scraper
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingCompetitors ? (
                <div className="space-y-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nom</TableHead>
                      <TableHead>URL de base</TableHead>
                      <TableHead>Rate limit</TableHead>
                      <TableHead>Sélecteur CSS</TableHead>
                      <TableHead className="text-right">Actif</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {competitors?.map((competitor) => (
                      <TableRow key={competitor.id}>
                        <TableCell className="font-medium">
                          {competitor.name}
                        </TableCell>
                        <TableCell>
                          <a
                            href={competitor.base_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline flex items-center gap-1"
                          >
                            {competitor.base_url}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </TableCell>
                        <TableCell>
                          {competitor.rate_limit_ms ? `${competitor.rate_limit_ms}ms` : '4000ms'}
                        </TableCell>
                        <TableCell className="max-w-[150px] truncate text-muted-foreground">
                          {competitor.price_selector || 'Auto-détection'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Switch
                            checked={competitor.enabled}
                            onCheckedChange={(enabled) => 
                              toggleCompetitor.mutate({ id: competitor.id, enabled })
                            }
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Historique des runs */}
        <TabsContent value="runs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Historique des Scrapings</CardTitle>
              <CardDescription>
                Suivi des exécutions automatiques et manuelles
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingRuns ? (
                <div className="space-y-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Prix sauvegardés</TableHead>
                      <TableHead>Erreurs</TableHead>
                      <TableHead>Durée</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {scrapeRuns?.map((run) => (
                      <TableRow key={run.id}>
                        <TableCell>
                          {new Date(run.started_at).toLocaleString('fr-FR')}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(run.status)}
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">{run.offers_saved}</span>
                        </TableCell>
                        <TableCell>
                          {run.errors_count > 0 ? (
                            <Badge variant="destructive">{run.errors_count}</Badge>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {run.finished_at ? (
                            <span className="text-muted-foreground">
                              {Math.round((new Date(run.finished_at).getTime() - new Date(run.started_at).getTime()) / 1000)}s
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {scrapeRuns?.length === 0 && !loadingRuns && (
                <div className="text-center py-8 text-muted-foreground">
                  Aucun scraping effectué
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}
