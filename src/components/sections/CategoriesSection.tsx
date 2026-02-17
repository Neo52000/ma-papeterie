import { ArrowRight, Leaf, Palette, Briefcase, GraduationCap, Printer, Stamp, BookOpen, Camera, Gift, Scissors } from "lucide-react";
import { useNavigate } from "react-router-dom";
import categorySchooolImage from "@/assets/category-scolaire.jpg";
import categoryOfficeImage from "@/assets/category-bureau.jpg";
import categoryEcoImage from "@/assets/category-eco.jpg";
import categoryVintageImage from "@/assets/category-vintage.jpg";
import categoryPhotocopiesImage from "@/assets/category-photocopies.jpg";
import categoryTamponsImage from "@/assets/category-tampons.jpg";
import categoryReliureImage from "@/assets/category-reliure.jpg";
import categoryPhotoImage from "@/assets/category-photo.jpg";

const categories = [
  { title: "Fournitures Scolaires", description: "Tout pour une rentrée réussie", image: categorySchooolImage, icon: GraduationCap, items: "Cahiers, stylos, cartables..." },
  { title: "Matériel de Bureau", description: "Équipez votre espace de travail", image: categoryOfficeImage, icon: Briefcase, items: "Classeurs, agrafes, calculatrices..." },
  { title: "Photocopies & Impressions", description: "Services rapides et qualité pro", image: categoryPhotocopiesImage, icon: Printer, items: "Copies couleur, noir & blanc, A3, A4..." },
  { title: "Tampons & Gravure", description: "Personnalisez vos documents", image: categoryTamponsImage, icon: Stamp, items: "Tampons encreurs, dateurs, personnalisés..." },
  { title: "Reliure & Plastification", description: "Finitions professionnelles", image: categoryReliureImage, icon: BookOpen, items: "Reliures spirales, thermiques, plastification..." },
  { title: "Développement Photo", description: "Souvenirs immortalisés", image: categoryPhotoImage, icon: Camera, items: "Tirages photos, albums, agrandissements..." },
  { title: "Écoresponsable", description: "Pour un avenir plus vert", image: categoryEcoImage, icon: Leaf, items: "Papier recyclé, stylos bambou..." },
  { title: "Licences Vintage", description: "Le charme rétro des années 80-90", image: categoryVintageImage, icon: Palette, items: "Designs nostalgiques, couleurs pop..." },
  { title: "Carterie & Cadeaux", description: "Pour toutes les occasions", image: categoryVintageImage, icon: Gift, items: "Cartes, emballages, petits cadeaux..." },
  { title: "Loisirs Créatifs", description: "Laissez libre cours à votre créativité", image: categoryEcoImage, icon: Scissors, items: "Scrapbooking, peinture, feutres..." }
];

const CategoriesSection = () => {
  const navigate = useNavigate();

  const handleCategoryClick = (category: string) => {
    if (category === "Fournitures Scolaires") {
      navigate("/listes-scolaires");
    } else {
      navigate("/catalogue");
    }
  };

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
            const Icon = category.icon;
            const isLarge = index < 2;
            return (
              <div 
                key={index}
                onClick={() => handleCategoryClick(category.title)}
                className={`group relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
                  isLarge ? 'lg:col-span-2 lg:row-span-2' : ''
                }`}
              >
                <div className={`relative ${isLarge ? 'h-80 lg:h-full' : 'h-48'} overflow-hidden`}>
                  <img 
                    src={category.image}
                    alt={category.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>
                  
                  {/* Content overlay */}
                  <div className="absolute inset-0 flex flex-col justify-end p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="bg-primary-foreground/20 backdrop-blur-sm p-1.5 rounded-lg">
                        <Icon className="w-4 h-4 text-primary-foreground" />
                      </div>
                      <h3 className={`font-semibold text-primary-foreground font-poppins ${isLarge ? 'text-xl' : 'text-base'}`}>
                        {category.title}
                      </h3>
                    </div>
                    <p className="text-primary-foreground/70 text-sm line-clamp-1">
                      {category.items}
                    </p>
                    
                    {/* Hover arrow */}
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
