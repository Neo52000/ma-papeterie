import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Star, ThumbsUp, ThumbsDown, Loader2 } from "lucide-react";
import { useProductReviews, useProductReviewStats, useSubmitReview, useMarkHelpful } from "@/hooks/useProductReviews";
import { useToast } from "@/hooks/use-toast";

interface ProductReviewsProps {
  productId: string;
  showForm?: boolean;
}

export function ProductReviews({ productId, showForm = true }: ProductReviewsProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState({
    authorName: "",
    authorEmail: "",
    authorCompany: "",
    rating: 5,
    title: "",
    body: "",
  });

  const { data: reviews = [], isLoading: reviewsLoading } = useProductReviews(productId);
  const { data: stats } = useProductReviewStats(productId);
  const { mutate: submitReview, isPending: isSubmitting } = useSubmitReview();
  const { mutate: markHelpful } = useMarkHelpful();
  const { toast } = useToast();

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.body.trim() || formData.body.length < 20) {
      toast({
        title: "Texte de review trop court",
        description: "Le review doit contenir au moins 20 caractères",
        variant: "destructive",
      });
      return;
    }

    submitReview(
      {
        productId,
        ...formData,
      },
      {
        onSuccess: () => {
          toast({
            title: "Merci pour votre avis!",
            description: "Votre review sera publié après modération.",
          });
          setFormData({
            authorName: "",
            authorEmail: "",
            authorCompany: "",
            rating: 5,
            title: "",
            body: "",
          });
          setIsFormOpen(false);
        },
        onError: (error) => {
          toast({
            title: "Erreur",
            description: error instanceof Error ? error.message : "Impossible de soumettre l'avis",
            variant: "destructive",
          });
        },
      }
    );
  };

  return (
    <section className="py-12">
      <div className="space-y-8">
        {/* Review Stats Summary */}
        {stats && stats.review_count > 0 && (
          <Card className="p-6">
            <div className="flex items-center gap-8">
              {/* Rating Summary */}
              <div className="flex items-center gap-4">
                <div>
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-4xl font-bold">{stats.avg_rating.toFixed(1)}</span>
                    <span className="text-muted-foreground">/ 5</span>
                  </div>
                  <div className="flex gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${
                          i < Math.round(stats.avg_rating)
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-gray-300"
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    {stats.review_count} avis
                  </p>
                </div>
              </div>

              {/* Rating Breakdown (optional detail) */}
              {stats.five_star_count !== undefined && (
                <div className="hidden sm:block text-xs space-y-1">
                  {[5, 4, 3, 2, 1].map((stars) => {
                    const key = `${stars}_star_count` as keyof typeof stats;
                    const count = (stats as any)[key] || 0;
                    const percent = stats.review_count > 0 ? (count / stats.review_count) * 100 : 0;
                    return (
                      <div key={stars} className="flex items-center gap-2">
                        <span className="w-5 text-right">{stars}★</span>
                        <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-yellow-400"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        <span className="text-gray-500 w-8 text-right">{count}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Submit Review Button/Form */}
        {showForm && (
          <div>
            {!isFormOpen ? (
              <Button onClick={() => setIsFormOpen(true)} variant="outline" size="lg">
                Partagez votre avis
              </Button>
            ) : (
              <Card className="p-6">
                <form onSubmit={handleSubmitReview} className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <Input
                      placeholder="Votre nom *"
                      value={formData.authorName}
                      onChange={(e) =>
                        setFormData({ ...formData, authorName: e.target.value })
                      }
                      required
                    />
                    <Input
                      placeholder="Votre email *"
                      type="email"
                      value={formData.authorEmail}
                      onChange={(e) =>
                        setFormData({ ...formData, authorEmail: e.target.value })
                      }
                      required
                    />
                  </div>

                  <Input
                    placeholder="École/Entreprise (optionnel)"
                    value={formData.authorCompany}
                    onChange={(e) =>
                      setFormData({ ...formData, authorCompany: e.target.value })
                    }
                  />

                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Votre note *
                    </label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setFormData({ ...formData, rating: star })}
                          className="p-1 hover:scale-110 transition-transform"
                        >
                          <Star
                            className={`w-8 h-8 ${
                              star <= formData.rating
                                ? "fill-yellow-400 text-yellow-400"
                                : "text-gray-300"
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  <Input
                    placeholder="Titre du review (optionnel)"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                  />

                  <Textarea
                    placeholder="Votre avis détaillé... (min 20 caractères) *"
                    value={formData.body}
                    onChange={(e) =>
                      setFormData({ ...formData, body: e.target.value })
                    }
                    minLength={20}
                    rows={4}
                    required
                  />

                  <div className="flex gap-2 justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsFormOpen(false)}
                    >
                      Annuler
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting && (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      )}
                      Soumettre l'avis
                    </Button>
                  </div>
                </form>
              </Card>
            )}
          </div>
        )}

        {/* Reviews List */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Avis clients</h3>
          {reviewsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : reviews.length === 0 ? (
            <p className="text-muted-foreground">Pas d'avis pour le moment. Soyez le premier!</p>
          ) : (
            reviews.map((review) => (
              <Card key={review.id} className="p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="flex gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3 h-3 ${
                              i < review.rating
                                ? "fill-yellow-400 text-yellow-400"
                                : "text-gray-300"
                            }`}
                          />
                        ))}
                      </div>
                      <span className="font-semibold text-sm">{review.title}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {review.author_name}
                      {review.author_company && ` (${review.author_company})`}
                    </p>
                  </div>
                  {review.is_verified_purchase && (
                    <Badge variant="secondary" className="text-xs">
                      ✓ Achat vérifié
                    </Badge>
                  )}
                </div>

                <p className="text-sm leading-relaxed">{review.body}</p>

                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="text-xs text-muted-foreground">
                    {new Date(review.created_at).toLocaleDateString("fr-FR")}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        markHelpful({
                          reviewId: review.id,
                          productId,
                          isHelpful: true,
                        })
                      }
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ThumbsUp className="w-3 h-3" />
                      {review.helpful_count > 0 && review.helpful_count}
                    </button>
                    <button
                      onClick={() =>
                        markHelpful({
                          reviewId: review.id,
                          productId,
                          isHelpful: false,
                        })
                      }
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ThumbsDown className="w-3 h-3" />
                      {review.unhelpful_count > 0 && review.unhelpful_count}
                    </button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
