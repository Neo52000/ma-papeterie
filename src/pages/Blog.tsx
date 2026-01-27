import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { blogPosts } from "@/data/blogPosts";
import { Calendar, Clock, ArrowRight } from "lucide-react";

const Blog = () => {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Blog",
    "name": "Blog Papeterie Reine & Fils - Actualités et conseils à Chaumont",
    "description": "Conseils, guides et actualités sur les services de papeterie, impression et fournitures à Chaumont (Haute-Marne).",
    "url": "https://ma-papeterie.lovable.app/blog",
    "publisher": {
      "@type": "LocalBusiness",
      "name": "Papeterie Reine & Fils",
      "address": {
        "@type": "PostalAddress",
        "streetAddress": "10 rue Toupot de Beveaux",
        "addressLocality": "Chaumont",
        "postalCode": "52000",
        "addressCountry": "FR"
      }
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
      }
    ]
  };

  const categories = [...new Set(blogPosts.map(post => post.category))];

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Blog Papeterie Chaumont | Conseils & Actualités | Reine & Fils</title>
        <meta 
          name="description" 
          content="Blog de la Papeterie Reine & Fils à Chaumont. Conseils impression, guides fournitures scolaires, actualités services express. Votre expert papeterie en Haute-Marne." 
        />
        <meta name="keywords" content="blog papeterie, conseils impression Chaumont, fournitures scolaires Haute-Marne, services papeterie" />
        <link rel="canonical" href="https://ma-papeterie.lovable.app/blog" />
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(breadcrumbData)}
        </script>
      </Helmet>

      <Header />

      <main className="container mx-auto px-4 py-12">
        {/* Hero Section */}
        <section className="text-center mb-16">
          <nav className="text-sm text-muted-foreground mb-4">
            <Link to="/" className="hover:text-primary">Accueil</Link>
            <span className="mx-2">/</span>
            <span className="text-foreground">Blog</span>
          </nav>
          
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            Notre Blog
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Conseils, guides pratiques et actualités sur les services de papeterie à Chaumont. 
            Restez informé des meilleures pratiques pour vos besoins professionnels et personnels.
          </p>
        </section>

        {/* Categories */}
        <section className="mb-12">
          <div className="flex flex-wrap justify-center gap-3">
            <Badge variant="secondary" className="text-sm px-4 py-2 cursor-pointer hover:bg-primary hover:text-primary-foreground">
              Tous les articles
            </Badge>
            {categories.map(category => (
              <Badge 
                key={category} 
                variant="outline" 
                className="text-sm px-4 py-2 cursor-pointer hover:bg-primary hover:text-primary-foreground"
              >
                {category}
              </Badge>
            ))}
          </div>
        </section>

        {/* Featured Article */}
        {blogPosts[0] && (
          <section className="mb-16">
            <Link to={`/blog/${blogPosts[0].slug}`}>
              <Card className="overflow-hidden hover:shadow-lg transition-shadow group">
                <div className="md:flex">
                  <div className="md:w-1/2 bg-muted h-64 md:h-auto flex items-center justify-center">
                    <span className="text-6xl">📰</span>
                  </div>
                  <div className="md:w-1/2 p-8">
                    <Badge className="mb-4">{blogPosts[0].category}</Badge>
                    <CardTitle className="text-2xl md:text-3xl mb-4 group-hover:text-primary transition-colors">
                      {blogPosts[0].title}
                    </CardTitle>
                    <CardDescription className="text-base mb-6">
                      {blogPosts[0].excerpt}
                    </CardDescription>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-6">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {new Date(blogPosts[0].publishedAt).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {blogPosts[0].readTime}
                      </span>
                    </div>
                    <span className="inline-flex items-center text-primary font-medium group-hover:gap-3 gap-2 transition-all">
                      Lire l'article <ArrowRight className="h-4 w-4" />
                    </span>
                  </div>
                </div>
              </Card>
            </Link>
          </section>
        )}

        {/* All Articles Grid */}
        <section>
          <h2 className="text-2xl font-bold text-foreground mb-8">Tous nos articles</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {blogPosts.slice(1).map((post) => (
              <Link key={post.id} to={`/blog/${post.slug}`}>
                <Card className="h-full hover:shadow-lg transition-shadow group">
                  <div className="h-48 bg-muted flex items-center justify-center">
                    <span className="text-4xl">
                      {post.category === "Services Express" ? "⚡" : 
                       post.category === "Conseils" ? "💡" : 
                       post.category === "Engagements" ? "🌱" : "📄"}
                    </span>
                  </div>
                  <CardHeader>
                    <Badge variant="secondary" className="w-fit mb-2">{post.category}</Badge>
                    <CardTitle className="text-lg group-hover:text-primary transition-colors line-clamp-2">
                      {post.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="line-clamp-3 mb-4">
                      {post.excerpt}
                    </CardDescription>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {new Date(post.publishedAt).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'short'
                        })}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {post.readTime}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section className="mt-16 bg-primary/5 rounded-2xl p-8 md:p-12 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
            Besoin d'un service ? Contactez-nous !
          </h2>
          <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
            Notre équipe est à votre disposition pour tous vos besoins en papeterie, 
            impression et services express à Chaumont.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              to="/services"
              className="inline-flex items-center justify-center px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
            >
              Découvrir nos services
            </Link>
            <Link 
              to="/contact"
              className="inline-flex items-center justify-center px-6 py-3 border border-primary text-primary rounded-lg font-medium hover:bg-primary/10 transition-colors"
            >
              Nous contacter
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Blog;
