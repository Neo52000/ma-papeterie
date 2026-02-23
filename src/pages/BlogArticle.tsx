import { useParams, Link, Navigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getBlogPostBySlug, getRecentPosts } from "@/data/blogPosts";
import { Calendar, Clock, User, ArrowLeft, ArrowRight } from "lucide-react";

const BlogArticle = () => {
  const { slug } = useParams<{ slug: string }>();
  const post = slug ? getBlogPostBySlug(slug) : undefined;
  const recentPosts = getRecentPosts(3).filter(p => p.slug !== slug);

  if (!post) {
    return <Navigate to="/blog" replace />;
  }

  const articleStructuredData = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": post.title,
    "description": post.metaDescription,
    "image": post.image,
    "author": {
      "@type": "Organization",
      "name": post.author
    },
    "publisher": {
      "@type": "LocalBusiness",
      "name": "Papeterie Reine & Fils",
      "address": {
        "@type": "PostalAddress",
        "streetAddress": "10 rue Toupot de Beveaux",
        "addressLocality": "Chaumont",
        "postalCode": "52000",
        "addressCountry": "FR"
      },
      "telephone": "07 45 062 162"
    },
    "datePublished": post.publishedAt,
    "dateModified": post.publishedAt,
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": `https://ma-papeterie.lovable.app/blog/${post.slug}`
    }
  };

  const breadcrumbData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Accueil",
        "item": "https://ma-papeterie.lovable.app"
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Blog",
        "item": "https://ma-papeterie.lovable.app/blog"
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": post.title,
        "item": `https://ma-papeterie.lovable.app/blog/${post.slug}`
      }
    ]
  };

  // Convertit **texte** en éléments <strong> React (sans dangerouslySetInnerHTML)
  const renderBold = (text: string) =>
    text.split(/\*\*(.*?)\*\*/g).map((part, i) =>
      i % 2 === 1 ? <strong key={i}>{part}</strong> : part
    );

  // Convertit le contenu markdown-like en éléments React (aucune injection HTML)
  const renderContent = (content: string) =>
    content
      .split('\n')
      .map((line, index) => {
        if (line.startsWith('# '))
          return <h1 key={index} className="text-3xl font-bold mt-8 mb-4">{line.slice(2)}</h1>;
        if (line.startsWith('## '))
          return <h2 key={index} className="text-2xl font-bold mt-8 mb-4">{line.slice(3)}</h2>;
        if (line.startsWith('### '))
          return <h3 key={index} className="text-xl font-semibold mt-6 mb-3">{line.slice(4)}</h3>;
        if (line.startsWith('- '))
          return <li key={index} className="ml-6 mb-2">{renderBold(line.slice(2))}</li>;
        if (line.startsWith('|') && !line.includes('---')) {
          const cells = line.split('|').filter(cell => cell.trim());
          return (
            <div key={index} className="grid grid-cols-3 gap-4 py-2 border-b">
              {cells.map((cell, i) => <span key={i} className="text-sm">{cell.trim()}</span>)}
            </div>
          );
        }
        if (line.trim() && !line.startsWith('|'))
          return <p key={index} className="mb-4 text-muted-foreground leading-relaxed">{renderBold(line)}</p>;
        return null;
      })
      .filter(Boolean);

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{post.title} | Blog Papeterie Reine & Fils Chaumont</title>
        <meta name="description" content={post.metaDescription} />
        <meta name="keywords" content={post.tags.join(', ')} />
        <link rel="canonical" href={`https://ma-papeterie.lovable.app/blog/${post.slug}`} />
        <meta property="og:title" content={post.title} />
        <meta property="og:description" content={post.metaDescription} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={`https://ma-papeterie.lovable.app/blog/${post.slug}`} />
        <meta property="article:published_time" content={post.publishedAt} />
        <meta property="article:author" content={post.author} />
        <meta property="article:section" content={post.category} />
        {post.tags.map(tag => (
          <meta key={tag} property="article:tag" content={tag} />
        ))}
        <script type="application/ld+json">
          {JSON.stringify(articleStructuredData)}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(breadcrumbData)}
        </script>
      </Helmet>

      <Header />

      <main className="container mx-auto px-4 py-12">
        {/* Breadcrumb */}
        <nav className="text-sm text-muted-foreground mb-8">
          <Link to="/" className="hover:text-primary">Accueil</Link>
          <span className="mx-2">/</span>
          <Link to="/blog" className="hover:text-primary">Blog</Link>
          <span className="mx-2">/</span>
          <span className="text-foreground">{post.title}</span>
        </nav>

        <div className="grid lg:grid-cols-3 gap-12">
          {/* Main Content */}
          <article className="lg:col-span-2">
            {/* Back Link */}
            <Link 
              to="/blog" 
              className="inline-flex items-center text-primary hover:underline mb-6 gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour au blog
            </Link>

            {/* Article Header */}
            <header className="mb-8">
              <Badge className="mb-4">{post.category}</Badge>
              <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
                {post.title}
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  {post.author}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {new Date(post.publishedAt).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {post.readTime} de lecture
                </span>
              </div>
            </header>

            {/* Featured Image Placeholder */}
            <div className="h-64 md:h-96 bg-muted rounded-xl flex items-center justify-center mb-8">
              <span className="text-6xl">
                {post.category === "Services Express" ? "⚡" : 
                 post.category === "Conseils" ? "💡" : 
                 post.category === "Engagements" ? "🌱" : "📄"}
              </span>
            </div>

            {/* Article Content */}
            <div className="prose prose-lg max-w-none">
              {renderContent(post.content)}
            </div>

            {/* Tags */}
            <div className="mt-12 pt-8 border-t">
              <h3 className="font-semibold mb-4">Mots-clés</h3>
              <div className="flex flex-wrap gap-2">
                {post.tags.map(tag => (
                  <Badge key={tag} variant="outline">{tag}</Badge>
                ))}
              </div>
            </div>

            {/* CTA */}
            <div className="mt-12 bg-primary/5 rounded-xl p-8 text-center">
              <h3 className="text-xl font-bold mb-3">Besoin de ce service ?</h3>
              <p className="text-muted-foreground mb-6">
                Contactez-nous ou rendez-nous visite au 10 rue Toupot de Beveaux à Chaumont.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link 
                  to="/services"
                  className="inline-flex items-center justify-center px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
                >
                  Nos services
                </Link>
                <Link 
                  to="/contact"
                  className="inline-flex items-center justify-center px-6 py-3 border border-primary text-primary rounded-lg font-medium hover:bg-primary/10 transition-colors"
                >
                  Nous contacter
                </Link>
              </div>
            </div>
          </article>

          {/* Sidebar */}
          <aside className="lg:col-span-1">
            {/* Recent Articles */}
            <Card className="sticky top-8">
              <CardHeader>
                <CardTitle className="text-lg">Articles récents</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {recentPosts.map(recentPost => (
                  <Link 
                    key={recentPost.id} 
                    to={`/blog/${recentPost.slug}`}
                    className="block group"
                  >
                    <div className="flex gap-4">
                      <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="text-2xl">
                          {recentPost.category === "Services Express" ? "⚡" : 
                           recentPost.category === "Conseils" ? "💡" : 
                           recentPost.category === "Engagements" ? "🌱" : "📄"}
                        </span>
                      </div>
                      <div>
                        <h4 className="font-medium text-sm group-hover:text-primary transition-colors line-clamp-2">
                          {recentPost.title}
                        </h4>
                        <span className="text-xs text-muted-foreground">
                          {new Date(recentPost.publishedAt).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'short'
                          })}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </CardContent>
            </Card>

            {/* Contact Card */}
            <Card className="mt-8">
              <CardHeader>
                <CardTitle className="text-lg">Nous contacter</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p className="flex items-start gap-2">
                  <span className="text-primary">📍</span>
                  10 rue Toupot de Beveaux<br />52000 Chaumont
                </p>
                <p className="flex items-center gap-2">
                  <span className="text-primary">📞</span>
                  07 45 062 162
                </p>
                <Link 
                  to="/contact"
                  className="inline-flex items-center text-primary hover:underline gap-1 mt-4"
                >
                  Voir la page contact <ArrowRight className="h-4 w-4" />
                </Link>
              </CardContent>
            </Card>
          </aside>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default BlogArticle;
