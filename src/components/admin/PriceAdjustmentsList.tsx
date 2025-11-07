import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePriceAdjustments, useApplyPriceAdjustment } from "@/hooks/usePricingRules";
import { CheckCircle, XCircle, Clock, TrendingUp, TrendingDown } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const PriceAdjustmentsList = () => {
  const [selectedStatus, setSelectedStatus] = useState<string>('pending');
  const { data: adjustments, isLoading } = usePriceAdjustments(selectedStatus);
  const applyAdjustment = useApplyPriceAdjustment();

  const handleApprove = (adjustmentId: string) => {
    applyAdjustment.mutate({ adjustmentId, approve: true });
  };

  const handleReject = (adjustmentId: string) => {
    applyAdjustment.mutate({ adjustmentId, approve: false });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      pending: { variant: "secondary", label: "En attente" },
      approved: { variant: "default", label: "Approuvé" },
      rejected: { variant: "destructive", label: "Rejeté" },
      applied: { variant: "default", label: "Appliqué" },
    };
    const config = variants[status] || variants.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(price);
  };

  if (isLoading) {
    return <div>Chargement...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ajustements de prix proposés</CardTitle>
        <CardDescription>Revue et validation des changements de prix automatiques</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={selectedStatus} onValueChange={setSelectedStatus}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="pending">
              <Clock className="h-4 w-4 mr-2" />
              En attente
            </TabsTrigger>
            <TabsTrigger value="approved">
              <CheckCircle className="h-4 w-4 mr-2" />
              Approuvés
            </TabsTrigger>
            <TabsTrigger value="rejected">
              <XCircle className="h-4 w-4 mr-2" />
              Rejetés
            </TabsTrigger>
            <TabsTrigger value="applied">
              <CheckCircle className="h-4 w-4 mr-2" />
              Appliqués
            </TabsTrigger>
          </TabsList>

          <TabsContent value={selectedStatus} className="mt-4">
            {!adjustments || adjustments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Aucun ajustement {selectedStatus === 'pending' ? 'en attente' : selectedStatus}
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produit</TableHead>
                      <TableHead>Catégorie</TableHead>
                      <TableHead className="text-right">Prix actuel</TableHead>
                      <TableHead className="text-right">Nouveau prix</TableHead>
                      <TableHead className="text-right">Variation</TableHead>
                      <TableHead className="text-right">Marge</TableHead>
                      <TableHead>Raison</TableHead>
                      <TableHead>Statut</TableHead>
                      {selectedStatus === 'pending' && <TableHead>Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {adjustments.map((adjustment) => {
                      const priceChange = adjustment.price_change_percent;
                      const isIncrease = priceChange > 0;

                      return (
                        <TableRow key={adjustment.id}>
                          <TableCell className="font-medium">
                            {adjustment.products?.name || 'N/A'}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{adjustment.products?.category || 'N/A'}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {formatPrice(adjustment.old_price_ht)}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {formatPrice(adjustment.new_price_ht)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className={`flex items-center justify-end ${isIncrease ? 'text-green-600' : 'text-red-600'}`}>
                              {isIncrease ? <TrendingUp className="h-4 w-4 mr-1" /> : <TrendingDown className="h-4 w-4 mr-1" />}
                              {priceChange > 0 ? '+' : ''}{priceChange.toFixed(2)}%
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            {adjustment.old_margin_percent && adjustment.new_margin_percent && (
                              <div className="text-sm">
                                <div className="text-muted-foreground">{adjustment.old_margin_percent.toFixed(1)}%</div>
                                <div className="font-semibold">{adjustment.new_margin_percent.toFixed(1)}%</div>
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="max-w-xs truncate text-sm">
                            {adjustment.reason || 'N/A'}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(adjustment.status)}
                          </TableCell>
                          {selectedStatus === 'pending' && (
                            <TableCell>
                              <div className="flex space-x-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleApprove(adjustment.id)}
                                  disabled={applyAdjustment.isPending}
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleReject(adjustment.id)}
                                  disabled={applyAdjustment.isPending}
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
