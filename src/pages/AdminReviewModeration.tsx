import { useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
// product_reviews is not yet in generated types — use a typed bypass
const db = supabase as unknown as { from: (table: string) => ReturnType<typeof supabase.from> };
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CheckCircle2, XCircle, Eye, Star } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

interface RawReviewRow {
  id: string;
  product_id: string;
  author_name: string;
  rating: number;
  title: string | null;
  comment: string;
  is_published: boolean;
  helpful_count: number;
  unhelpful_count: number;
  created_at: string;
  updated_at: string;
  products: { name: string } | null;
}

interface ProductReview {
  id: string;
  product_id: string;
  product_name?: string;
  author_name: string;
  rating: number;
  title?: string;
  comment: string;
  is_published: boolean;
  helpful_count: number;
  unhelpful_count: number;
  created_at: string;
  updated_at: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// Fetch Hook
// ──────────────────────────────────────────────────────────────────────────────

function useReviewsForModeration() {
  return useQuery({
    queryKey: ['reviews-moderation'],
    queryFn: async () => {
      const { data, error } = await (supabase as unknown as typeof supabase).from('product_reviews' as 'products')
        .select(`
          id, product_id, author_name, rating, title, comment,
          is_published, helpful_count, unhelpful_count,
          created_at, updated_at,
          products(name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return ((data as RawReviewRow[] | null) || []).map((r) => ({
        ...r,
        product_name: r.products?.name || 'Produit inconnu',
      }));
    },
  });
}

// ──────────────────────────────────────────────────────────────────────────────
// Mutations
// ──────────────────────────────────────────────────────────────────────────────

function usePublishReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (reviewId: string) => {
      const { error } = await (supabase.from as any)('product_reviews')
        .update({ is_published: true })
        .eq('id', reviewId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews-moderation'] });
      toast.success('Avis publié');
    },
    onError: (err: unknown) => toast.error(err instanceof Error ? err.message : 'Erreur inconnue'),
  });
}

function useRejectReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ reviewId }: { reviewId: string }) => {
      const { error } = await (supabase.from as any)('product_reviews')
        .delete()
        .eq('id', reviewId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews-moderation'] });
      toast.success('Avis rejeté et supprimé');
    },
    onError: (err: unknown) => toast.error(err instanceof Error ? err.message : 'Erreur inconnue'),
  });
}

// ──────────────────────────────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────────────────────────────

export default function AdminReviewModeration() {
  const { user } = useAuth();
  const { data: reviews = [], isLoading, error } = useReviewsForModeration();
  const publishMutation = usePublishReview();
  const rejectMutation = useRejectReview();

  const [selectedReview, setSelectedReview] = useState<ProductReview | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  if (!user) return null;

  // Split reviews by status
  const pendingReviews = reviews.filter((r: ProductReview) => !r.is_published);
  const publishedReviews = reviews.filter((r: ProductReview) => r.is_published);

  const handlePublish = async (reviewId: string) => {
    await publishMutation.mutateAsync(reviewId);
  };

  const handleRejectClick = (review: ProductReview) => {
    setSelectedReview(review);
    setRejectionReason('');
    setShowRejectDialog(true);
  };

  const handleConfirmReject = async () => {
    if (!selectedReview) return;
    await rejectMutation.mutateAsync({
      reviewId: selectedReview.id,
    });
    setShowRejectDialog(false);
    setSelectedReview(null);
  };

  const StarsRating = ({ rating }: { rating: number }) => (
    <div className="flex gap-1">
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          size={16}
          className={i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
        />
      ))}
    </div>
  );

  const ReviewRow = ({ review }: { review: ProductReview }) => (
    <TableRow>
      <TableCell className="max-w-xs">
        <div className="font-medium truncate">{review.product_name}</div>
        <div className="text-sm text-gray-500">{review.author_name}</div>
      </TableCell>
      <TableCell>
        <StarsRating rating={review.rating} />
      </TableCell>
      <TableCell className="max-w-md">
        <div className="text-sm line-clamp-2">{review.comment}</div>
      </TableCell>
      <TableCell>
        <div className="text-xs text-gray-500">
          {new Date(review.created_at).toLocaleDateString('fr-FR')}
        </div>
      </TableCell>
      <TableCell>
        <div className="flex gap-2">
          <span className="text-sm font-medium">{review.helpful_count}</span>
          <span className="text-sm text-gray-500">👍</span>
        </div>
      </TableCell>
      <TableCell>
        {review.is_published ? (
          <Badge variant="outline" className="bg-green-50">
            ✓ Publié
          </Badge>
        ) : (
          <Badge variant="outline" className="bg-yellow-50">
            🔄 En attente
          </Badge>
        )}
      </TableCell>
      <TableCell>
        <div className="flex gap-2">
          {!review.is_published && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handlePublish(review.id)}
                disabled={publishMutation.isPending}
              >
                <CheckCircle2 size={16} className="text-green-600" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleRejectClick(review)}
                disabled={rejectMutation.isPending}
              >
                <XCircle size={16} className="text-red-600" />
              </Button>
            </>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSelectedReview(review)}
          >
            <Eye size={16} />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );

  return (
    <AdminLayout title="Modération des avis">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Modération des avis clients</h1>
          <p className="text-gray-600 mt-2">
            Approuvez ou rejetez les avis clients avant publication
          </p>
        </div>

        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <p className="text-red-800">Erreur : {error instanceof Error ? error.message : 'Erreur inconnue'}</p>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="pending" className="w-full">
          <TabsList>
            <TabsTrigger value="pending">
              En attente ({pendingReviews.length})
            </TabsTrigger>
            <TabsTrigger value="published">
              Publiés ({publishedReviews.length})
            </TabsTrigger>
            <TabsTrigger value="stats">Statistiques</TabsTrigger>
          </TabsList>

          {/* ── Pending Reviews ── */}
          <TabsContent value="pending">
            <Card>
              <CardHeader>
                <CardTitle>Avis en attente d'approbation</CardTitle>
                <CardDescription>
                  {pendingReviews.length} avis à modérer
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <p className="text-gray-500">Chargement...</p>
                ) : pendingReviews.length === 0 ? (
                  <p className="text-gray-500">Aucun avis en attente ✓</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Produit / Auteur</TableHead>
                          <TableHead>Note</TableHead>
                          <TableHead>Commentaire</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Votes</TableHead>
                          <TableHead>Statut</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pendingReviews.map((review: ProductReview) => (
                          <ReviewRow key={review.id} review={review} />
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Published Reviews ── */}
          <TabsContent value="published">
            <Card>
              <CardHeader>
                <CardTitle>Avis publiés</CardTitle>
                <CardDescription>
                  {publishedReviews.length} avis visibles par les clients
                </CardDescription>
              </CardHeader>
              <CardContent>
                {publishedReviews.length === 0 ? (
                  <p className="text-gray-500">Aucun avis publié pour le moment</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Produit / Auteur</TableHead>
                          <TableHead>Note</TableHead>
                          <TableHead>Commentaire</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Votes</TableHead>
                          <TableHead>Statut</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {publishedReviews.map((review: ProductReview) => (
                          <ReviewRow key={review.id} review={review} />
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Statistics ── */}
          <TabsContent value="stats">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Total avis</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{reviews.length}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">En attente</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-600">
                    {pendingReviews.length}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Publiés</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {publishedReviews.length}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Taux publication</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {reviews.length > 0
                      ? `${Math.round((publishedReviews.length / reviews.length) * 100)}%`
                      : '-'}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Rating Distribution */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Distribution des notes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[5, 4, 3, 2, 1].map(rating => {
                    const count = reviews.filter((r: ProductReview) => r.rating === rating).length;
                    const percentage = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
                    return (
                      <div key={rating} className="flex items-center gap-3">
                        <div className="w-12 text-sm font-medium">{rating} ⭐</div>
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <div className="w-12 text-right text-sm">{count}</div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* ── Rejection Dialog ── */}
        <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rejeter cet avis</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium">
                  {selectedReview?.product_name} - {selectedReview?.author_name}
                </p>
                <p className="text-sm text-gray-600 mt-2">{selectedReview?.comment}</p>
              </div>
              <Textarea
                placeholder="Raison du rejet (optionnel)..."
                value={rejectionReason}
                onChange={e => setRejectionReason(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowRejectDialog(false)}
              >
                Annuler
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirmReject}
                disabled={rejectMutation.isPending}
              >
                Confirmer le rejet
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
