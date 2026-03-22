import { Helmet } from "react-helmet-async";
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
const sb = supabase as any; // bypass stale generated types for blog tables
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Loader2, Calendar, Clock, Search } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Link } from 'react-router-dom';

export function BlogPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Récupérer les articles publiés
  const { data: articles = [], isLoading } = useQuery({
    queryKey: ['blog_articles_published'],
    queryFn: async () => {
      const { data, error } = await sb
        .from('blog_articles')
        .select('*, blog_seo_metadata(*)')
        .not('published_at', 'is', null)
        .order('published_at', { ascending: false });

      if (error) throw error;
      return data as any[];
    },
    staleTime: 30 * 60 * 1000, // 30 min — articles rarement modifiés
  });

  // Filtrer les articles
  const filteredArticles = articles.filter((article) => {
    const matchesSearch =
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.excerpt?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = !selectedCategory || article.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const categories = [
    { id: 'seo', label: 'SEO & Marketing', icon: '🎯' },
    { id: 'papeterie', label: 'Papeterie', icon: '📄' },
    { id: 'conseils', label: 'Conseils', icon: '💡' },
  ];

  return (
    <div className="min-h-screen bg-white py-12">
      <Helmet>
        <title>Blog — Ma Papeterie</title>
        <meta name="description" content="Conseils, astuces et actualités sur les fournitures scolaires et de bureau. Le blog de Ma Papeterie." />
        <link rel="canonical" href="https://ma-papeterie.fr/blog" />
      </Helmet>
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Blog Ma Papeterie
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl">
            Découvrez nos articles sur la papeterie, les fournitures scolaires
            et les conseils pour bien s'équiper.
          </p>
        </div>

        {/* Search and Filters */}
        <div className="mb-8 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <Input
              placeholder="Rechercher dans les articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 py-6 text-base"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedCategory === null ? 'default' : 'outline'}
              onClick={() => setSelectedCategory(null)}
              className="rounded-full"
            >
              Tous les articles
            </Button>
            {categories.map((cat) => (
              <Button
                key={cat.id}
                variant={selectedCategory === cat.id ? 'default' : 'outline'}
                onClick={() => setSelectedCategory(cat.id)}
                className="rounded-full"
              >
                {cat.icon} {cat.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Articles Grid */}
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : filteredArticles.length === 0 ? (
          <Card className="text-center py-12">
            <p className="text-gray-500 text-lg">
              Aucun article trouvé. Essayez une autre recherche.
            </p>
          </Card>
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            {filteredArticles.map((article) => {
              const metadata = article.blog_seo_metadata[0];
              const category = categories.find((c) => c.id === article.category);

              return (
                <Link
                  key={article.id}
                  to={`/blog/${article.slug}`}
                  className="group"
                >
                  <Card className="h-full hover:shadow-lg transition-shadow overflow-hidden">
                    {/* Image */}
                    {article.image_url && (
                      <div className="aspect-video bg-gray-200 overflow-hidden">
                        <img
                          src={article.image_url}
                          alt={article.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    )}

                    <CardHeader>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        {category && (
                          <Badge variant="outline" className="rounded">
                            {category.icon} {category.label}
                          </Badge>
                        )}
                        {metadata?.reading_time && (
                          <Badge variant="secondary" className="whitespace-nowrap">
                            <Clock className="w-3 h-3 mr-1" />
                            {metadata.reading_time} min
                          </Badge>
                        )}
                      </div>

                      <CardTitle className="line-clamp-2 group-hover:text-blue-600 transition-colors">
                        {article.title}
                      </CardTitle>

                      {article.excerpt && (
                        <CardDescription className="line-clamp-2">
                          {article.excerpt}
                        </CardDescription>
                      )}
                    </CardHeader>

                    <CardContent>
                      <div className="space-y-3">
                        {/* Keywords */}
                        {metadata?.keywords && metadata.keywords.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {metadata.keywords.slice(0, 3).map((keyword: string) => (
                              <Badge
                                key={keyword}
                                variant="secondary"
                                className="text-xs"
                              >
                                {keyword}
                              </Badge>
                            ))}
                            {metadata.keywords.length > 3 && (
                              <Badge variant="secondary" className="text-xs">
                                +{metadata.keywords.length - 3}
                              </Badge>
                            )}
                          </div>
                        )}

                        {/* Metadata */}
                        <div className="flex items-center text-sm text-gray-500 gap-2">
                          <Calendar className="w-4 h-4" />
                          {article.published_at &&
                            formatDistanceToNow(new Date(article.published_at), {
                              locale: fr,
                              addSuffix: true,
                            })}
                        </div>

                        {/* Word count */}
                        {metadata?.word_count && (
                          <div className="text-xs text-gray-500">
                            {metadata.word_count} mots
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}

        {/* SEO Schema */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Blog',
              name: 'Blog Ma Papeterie',
              description: 'Articles sur la papeterie et les fournitures scolaires',
              url: window.location.origin + '/blog',
              image: '',
              blogPost: filteredArticles.map((article) => ({
                '@type': 'BlogPosting',
                headline: article.title,
                datePublished: article.published_at,
                description: article.excerpt,
                image: article.image_url,
                url: window.location.origin + '/blog/' + article.slug,
              })),
            }),
          }}
        />
      </div>
    </div>
  );
}
