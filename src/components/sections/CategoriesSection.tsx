import { ArrowRight, Package } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

import imgConsommables from "@/assets/categories/consommables.jpg";
import imgEcrire from "@/assets/categories/ecrire-corriger.jpg";
import imgJeux from "@/assets/categories/jeux.jpg";
import imgConsoInfo from "@/assets/categories/consommables-info.jpg";
import imgClassement from "@/assets/categories/classement.jpg";
import imgPeinture from "@/assets/categories/peinture.jpg";
import imgCahiers from "@/assets/categories/cahiers.jpg";
import imgPetitMateriel from "@/assets/categories/petit-materiel.jpg";
import imgTravauxManuels from "@/assets/categories/travaux-manuels.jpg";
import imgServicesGeneraux from "@/assets/categories/services-generaux.jpg";
import imgMobilier from "@/assets/categories/mobilier.jpg";
import imgChemises from "@/assets/categories/chemises.jpg";

const categoryImages: Record<string, string> = {
  "CONSOMMABLES": imgConsommables,
  "ECRIRE ET CORRIGER": imgEcrire,
  "JEUX": imgJeux,
  "CONSOMMABLES INFORMATIQUES": imgConsoInfo,
  "CLASSEMENT": imgClassement,
  "PEINTURE": imgPeinture,
  "CAHIERS ET DERIVES DE PAPIER": imgCahiers,
  "CAHIERS": imgCahiers,
  "CAHIERS SCOLAIRES": imgCahiers,
  "CAHIERS DE BUREAU": imgCahiers,
  "PETIT MATERIEL BUREAU ET ECOLE": imgPetitMateriel,
  "TRAVAUX MANUELS": imgTravauxManuels,
  "SERVICES GENERAUX": imgServicesGeneraux,
  "MOBILIER": imgMobilier,
  "CHEMISES": imgChemises,
};

interface CategoryWithCount {
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
        // 1. Get top categories by product count directly from products table
        const { data: products, error: prodError } = await supabase
          .from("products")
          .select("category")
          .eq("is_active", true);

        if (prodError) throw prodError;

        const countMap = new Map<string, number>();
        products?.forEach((p) => {
          const cat = p.category || "";
          if (cat) countMap.set(cat, (countMap.get(cat) || 0) + 1);
        });

        // Sort by count, take top 10
        const topCategories = [...countMap.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10);

        // 2. Try to match with categories table for slug & image
        const { data: cats } = await supabase
          .from("categories")
          .select("name, slug, image_url")
          .eq("is_active", true);

        const catLookup = new Map<string, { slug: string; image_url: string | null }>();
        cats?.forEach((c) => {
          catLookup.set(c.name.toUpperCase(), { slug: c.slug, image_url: c.image_url });
        });

        const result: CategoryWithCount[] = topCategories.map(([name, count]) => {
          const match = catLookup.get(name.toUpperCase());
          const localImage = categoryImages[name.toUpperCase()] || null;
          return {
            name,
            slug: match?.slug || name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
            image_url: match?.image_url || localImage,
            product_count: count,
          };
        });

        setCategories(result);
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
                key={category.slug}
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
                    <h3
                      className={`font-semibold text-primary-foreground font-poppins ${
                        isLarge ? "text-xl" : "text-base"
                      }`}
                    >
                      {category.name}
                    </h3>
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
