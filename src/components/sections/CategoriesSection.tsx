import { ArrowRight, Package } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface CategoryWithCount {
  id: string;
  name: string;
  slug: string;
  image_url: string | null;
  product_count: number;
}

const CategoriesSection = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<CategoryWithCount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTopCategories = async () => {
      try {
        // Fetch active categories
        const { data: cats, error: catError } = await supabase
          .from("categories")
          .select("id, name, slug, image_url")
          .eq("is_active", true)
          .order("sort_order", { ascending: true })
          .order("name", { ascending: true });

        if (catError) throw catError;

        // Count products per category
        const { data: products, error: prodError } = await supabase
          .from("products")
          .select("category")
          .eq("is_active", true);

        if (prodError) throw prodError;

        const countMap = new Map<string, number>();
        products?.forEach((p) => {
          const cat = (p.category || "").toUpperCase();
          countMap.set(cat, (countMap.get(cat) || 0) + 1);
        });

        const withCounts = (cats || []).map((c) => ({
          ...c,
          product_count: countMap.get(c.name.toUpperCase()) || 0,
        }));

        // Sort by product count descending and take top 10
        withCounts.sort((a, b) => b.product_count - a.product_count);
        setCategories(withCounts.slice(0, 10));
      } catch (err) {
        console.error("Error fetching categories:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchTopCategories();
  }, []);

  const handleCategoryClick = (slug: string) => {
    navigate(`/catalogue?category=${slug}`);
  };

  if (loading) {
    return (
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14">
            <span className="text-sm font-semibold uppercase tracking-wider text-primary">Catégories</span>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mt-2 mb-4 font-poppins">
              Explorez nos univers
            </h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className={`rounded-2xl bg-muted animate-pulse ${i < 2 ? 'lg:col-span-2 lg:row-span-2 h-80' : 'h-48'}`} />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (categories.length === 0) return null;

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-14">
          <span className="text-sm font-semibold uppercase tracking-wider text-primary">Catégories</span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mt-2 mb-4 font-poppins">
            Explorez nos univers
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Une gamme complète soigneusement sélectionnée pour tous vos besoins.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4">
          {categories.map((category, index) => {
            const isLarge = index < 2;
            return (
              <div
                key={category.id}
                onClick={() => handleCategoryClick(category.slug)}
                className={`group relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
                  isLarge ? "lg:col-span-2 lg:row-span-2" : ""
                }`}
              >
                <div className={`relative ${isLarge ? "h-80 lg:h-full" : "h-48"} overflow-hidden`}>
                  {category.image_url ? (
                    <img
                      src={category.image_url}
                      alt={category.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                      <Package className="w-12 h-12 text-primary/40" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                  <div className="absolute inset-0 flex flex-col justify-end p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <h3
                        className={`font-semibold text-primary-foreground font-poppins ${
                          isLarge ? "text-xl" : "text-base"
                        }`}
                      >
                        {category.name}
                      </h3>
                    </div>
                    <p className="text-primary-foreground/70 text-sm">
                      {category.product_count} article{category.product_count > 1 ? "s" : ""}
                    </p>

                    <div className="flex items-center gap-1 text-secondary text-sm font-medium mt-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
                      Découvrir <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default CategoriesSection;
