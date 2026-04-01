import { Helmet } from "react-helmet-async";
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabase as any; // bypass stale generated types for blog tables
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Loader2, Share2, MessageCircle, Calendar, Clock, ArrowRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { sanitizeHtml } from '@/lib/sanitize';

export function BlogArticlePage() {
  const { slug } = useParams<{ slug: string }>();

  const [commentForm, setCommentForm] = useState({
    author_name: '',
    author_email: '',
    content: '',
  });

  // Récupérer l'article
  const { data: article, isLoading: articleLoading } = useQuery({
    queryKey: ['blog_article', slug],
    queryFn: async () => {
      const { data, error } = await sb
        .from('blog_articles')
        .select('*, blog_seo_metadata(*)')
        .eq('slug', slug)
        .single();

      if (error) throw error;
      return data;
    },
    staleTime: 30 * 60 * 1000, // 30 min
  });

  // Récupérer les commentaires approuvés
  const { data: comments = [] } = useQuery({
    queryKey: ['blog_comments', article?.id],
    queryFn: async () => {
      if (!article?.id) return [];

      const { data, error } = await sb
        .from('blog_comments')
        .select('*')
        .eq('article_id', article.id)
        .eq('is_approved', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!article?.id,
  });

  // Récupérer les articles recommandés
  const { data: relatedArticles = [] } = useQuery({
    queryKey: ['related_articles', article?.category],
    queryFn: async () => {
      if (!article?.category) return [];

      const { data, error } = await sb
        .from('blog_articles')
        .select('*, blog_seo_metadata(*)')
        .eq('category', article.category)
        .not('id', 'eq', article.id)
        .not('published_at', 'is', null)
        .limit(3)
        .order('published_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!article?.id,
    staleTime: 30 * 60 * 1000, // 30 min
  });

  // Incrémenter les vues
  useQuery({
    queryKey: ['track_view', article?.id],
    queryFn: async () => {
      if (!article?.id) return;

      await sb.from('blog_article_views').insert({
        article_id: article.id,
        read_time_seconds: 0,
        referrer: document.referrer,
      });
    },
    enabled: !!article?.id,
    staleTime: Infinity,
  });

  // Ajouter un commentaire
  const addComment = useMutation({
    mutationFn: async () => {
      if (!article?.id) throw new Error('Article not found');

      const { error } = await sb.from('blog_comments').insert({
        article_id: article.id,
        author_name: commentForm.author_name,
        author_email: commentForm.author_email,
        content: commentForm.content,
        is_approved: false,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      setCommentForm({ author_name: '', author_email: '', content: '' });
      toast.success('Merci !', {
        description: 'Votre commentaire a été soumis et sera approuvé prochainement.',
      });
    },
    onError: () => {
      toast.error('Erreur', {
        description: 'Impossible de poster le commentaire.',
      });
    },
  });

  if (articleLoading) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        <Card className="p-6 text-center">
          <p className="text-lg text-gray-500">Article non trouvé</p>
          <Link to="/blog">
            <Button variant="link" className="mt-4">
              Retour au blog
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  const metadata = article.blog_seo_metadata?.[0];

  return (
    <article className="min-h-screen bg-white">
      <Helmet>
        <title>{`${article.title} — Ma Papeterie`}</title>
        <meta name="description" content={metadata?.meta_description || article.excerpt || article.title} />
        <link rel="canonical" href={`https://ma-papeterie.fr/blog/${article.slug}`} />
        <meta property="og:title" content={`${article.title} — Ma Papeterie`} />
        <meta property="og:description" content={metadata?.meta_description || article.excerpt || article.title} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={`https://ma-papeterie.fr/blog/${article.slug}`} />
        <meta property="og:image" content={article.featured_image || "https://ma-papeterie.fr/og-image.png"} />
      </Helmet>
      {/* Header de l'article */}
      <div className="bg-gray-50 border-b">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="mb-6 flex items-center gap-2 flex-wrap">
            <Badge>{article.category || 'Article'}</Badge>
            {metadata?.reading_time && (
              <Badge variant="secondary">
                <Clock className="w-3 h-3 mr-1" />
                {metadata.reading_time} min de lecture
              </Badge>
            )}
          </div>

          <h1 className="text-4xl md:text-5xl font-bold mb-4">{article.title}</h1>

          {article.excerpt && (
            <p className="text-xl text-gray-600 mb-6">{article.excerpt}</p>
          )}

          <div className="flex items-center gap-6 text-sm text-gray-600">
            {article.published_at && (
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {formatDistanceToNow(new Date(article.published_at), {
                  locale: fr,
                  addSuffix: true,
                })}
              </div>
            )}
            {metadata?.word_count && (
              <div>{metadata.word_count} mots</div>
            )}
          </div>
        </div>
      </div>

      {/* Image hero */}
      {article.image_url && (
        <div className="aspect-video bg-gray-200 overflow-hidden">
          <img
            src={article.image_url}
            alt={article.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="grid md:grid-cols-3 gap-8">
          {/* Contenu principal */}
          <div className="md:col-span-2">
            {/* Contenu HTML riche */}
            <div
              className="prose prose-lg max-w-none mb-12"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(article.content || '<p>Contenu non disponible</p>') }}
            />

            {/* Keywords */}
            {metadata?.keywords && metadata.keywords.length > 0 && (
              <Card className="mb-12">
                <CardHeader>
                  <CardTitle className="text-lg">Mots-clés</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {metadata.keywords.map((keyword: string) => (
                      <Badge key={keyword} variant="secondary">
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Share buttons */}
            <Card className="mb-12">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Share2 className="w-5 h-5" />
                  Partager
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    const url = window.location.href;
                    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
                      url
                    )}`;
                    window.open(facebookUrl, '_blank');
                  }}
                >
                  Facebook
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    const url = window.location.href;
                    const text = article.title;
                    const twitterUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(
                      url
                    )}&text=${encodeURIComponent(text)}`;
                    window.open(twitterUrl, '_blank');
                  }}
                >
                  Twitter
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href);
                    toast.success('Copié', {
                      description: 'Lien copié dans le presse-papiers',
                    });
                  }}
                >
                  Copier le lien
                </Button>
              </CardContent>
            </Card>

            {/* Comments Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageCircle className="w-5 h-5" />
                  Commentaires ({comments.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Add comment form */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    addComment.mutate();
                  }}
                  className="space-y-4 p-4 bg-gray-50 rounded-lg border"
                >
                  <h3 className="font-medium">Ajouter un commentaire</h3>

                  <Input
                    placeholder="Votre nom"
                    value={commentForm.author_name}
                    onChange={(e) =>
                      setCommentForm({
                        ...commentForm,
                        author_name: e.target.value,
                      })
                    }
                    required
                  />

                  <Input
                    type="email"
                    placeholder="Votre email"
                    value={commentForm.author_email}
                    onChange={(e) =>
                      setCommentForm({
                        ...commentForm,
                        author_email: e.target.value,
                      })
                    }
                    required
                  />

                  <Textarea
                    placeholder="Votre commentaire..."
                    value={commentForm.content}
                    onChange={(e) =>
                      setCommentForm({
                        ...commentForm,
                        content: e.target.value,
                      })
                    }
                    required
                    className="resize-none"
                  />

                  <p className="text-xs text-gray-500">
                    Votre commentaire sera approuvé avant publication.
                  </p>

                  <Button
                    type="submit"
                    disabled={addComment.isPending}
                    className="w-full"
                  >
                    {addComment.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Envoi en cours...
                      </>
                    ) : (
                      'Publier le commentaire'
                    )}
                  </Button>
                </form>

                {/* Comments list */}
                {comments.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">
                    Aucun commentaire pour le moment.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {comments.map((comment: { id: string; author_name: string; created_at: string; content: string }) => (
                      <Card key={comment.id} className="border-l-4 border-l-blue-500">
                        <CardContent className="pt-4">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className="font-medium">{comment.author_name}</p>
                              <p className="text-sm text-gray-500">
                                {formatDistanceToNow(
                                  new Date(comment.created_at),
                                  {
                                    locale: fr,
                                    addSuffix: true,
                                  }
                                )}
                              </p>
                            </div>
                          </div>
                          <p className="text-gray-700">{comment.content}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Table of contents */}
            {metadata?.keywords && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Sujets couverts</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    {metadata.keywords.map((keyword: string) => (
                      <li key={keyword} className="text-gray-600">
                        • {keyword}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Related articles */}
            {relatedArticles.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Articles similaires</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {relatedArticles.map((related: { id: string; slug: string; title: string }) => (
                    <Link
                      key={related.id}
                      to={`/blog/${related.slug}`}
                      className="block group"
                    >
                      <div className="p-3 rounded border hover:bg-blue-50 transition">
                        <p className="font-medium text-sm group-hover:text-blue-600 line-clamp-2">
                          {related.title}
                        </p>
                        <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                          <ArrowRight className="w-3 h-3" />
                          Lire plus
                        </div>
                      </div>
                    </Link>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* CTA */}
            <Card className="bg-blue-50 border-blue-200">
              <CardHeader>
                <CardTitle className="text-lg">Besoin de fournitures ?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-700 mb-4">
                  Retrouvez tous les produits mentionnés dans nos magasins en ligne.
                </p>
                <Link to="/shop">
                  <Button className="w-full">Voir les produits</Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Schema.org structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BlogPosting',
            headline: article.title,
            description: article.excerpt || article.title,
            image: article.image_url || '',
            datePublished: article.published_at,
            dateModified: article.updated_at,
            author: {
              '@type': 'Organization',
              name: 'Ma Papeterie',
              url: window.location.origin,
            },
            publisher: {
              '@type': 'Organization',
              name: 'Ma Papeterie',
              logo: {
                '@type': 'ImageObject',
                url: window.location.origin + '/logo.png',
              },
            },
            keywords: metadata?.keywords?.join(', ') || '',
            wordCount: metadata?.word_count || 0,
            aggregateRating: {
              '@type': 'AggregateRating',
              ratingValue: '5',
              ratingCount: comments.length,
            },
          }).replace(/</g, '\\u003c'),
        }}
      />
    </article>
  );
}
