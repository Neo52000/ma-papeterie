import { Button } from "@/components/ui/button";
import { ArrowRight, Leaf, Palette, Briefcase, GraduationCap } from "lucide-react";
import categorySchooolImage from "@/assets/category-scolaire.jpg";
import categoryOfficeImage from "@/assets/category-bureau.jpg";
import categoryEcoImage from "@/assets/category-eco.jpg";
import categoryVintageImage from "@/assets/category-vintage.jpg";

const categories = [
  {
    title: "Fournitures Scolaires",
    description: "Tout pour une rentrée réussie",
    image: categorySchooolImage,
    icon: GraduationCap,
    color: "primary",
    items: "Cahiers, stylos, cartables..."
  },
  {
    title: "Matériel de Bureau",
    description: "Équipez votre espace de travail",
    image: categoryOfficeImage,
    icon: Briefcase,
    color: "secondary",
    items: "Classeurs, agrafes, calculatrices..."
  },
  {
    title: "Écoresponsable",
    description: "Pour un avenir plus vert",
    image: categoryEcoImage,
    icon: Leaf,
    color: "accent",
    items: "Papier recyclé, stylos bambou..."
  },
  {
    title: "Licences Vintage",
    description: "Le charme rétro des années 80-90",
    image: categoryVintageImage,
    icon: Palette,
    color: "vintage",
    items: "Designs nostalgiques, couleurs pop..."
  }
];

const CategoriesSection = () => {
  return (
    <section className="py-16 bg-background">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 font-poppins">
            Nos Catégories
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Découvrez notre large gamme de produits, soigneusement sélectionnés 
            pour répondre à tous vos besoins en papeterie.
          </p>
        </div>

        {/* Categories Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {categories.map((category, index) => {
            const Icon = category.icon;
            return (
              <div 
                key={index}
                className="group relative bg-card rounded-2xl overflow-hidden shadow-card hover:shadow-vintage transition-smooth cursor-pointer"
              >
                {/* Image */}
                <div className="relative h-48 overflow-hidden">
                  <img 
                    src={category.image}
                    alt={category.title}
                    className="w-full h-full object-cover transition-transform group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                  
                  {/* Icon */}
                  <div className={`absolute top-4 right-4 p-2 rounded-full ${
                    category.color === 'primary' ? 'bg-primary text-primary-foreground' :
                    category.color === 'secondary' ? 'bg-secondary text-secondary-foreground' :
                    category.color === 'accent' ? 'bg-accent text-accent-foreground' :
                    'bg-vintage-cream text-vintage-brown'
                  }`}>
                    <Icon className="w-5 h-5" />
                  </div>
                </div>

                {/* Content */}
                <div className="p-6">
                  <h3 className="text-xl font-semibold text-card-foreground mb-2 font-poppins">
                    {category.title}
                  </h3>
                  <p className="text-muted-foreground text-sm mb-3">
                    {category.description}
                  </p>
                  <p className="text-xs text-muted-foreground mb-4">
                    {category.items}
                  </p>
                  
                  <Button 
                    variant={category.color === 'vintage' ? 'vintage' : 'outline'} 
                    size="sm" 
                    className="w-full group-hover:shadow-soft transition-smooth"
                  >
                    Découvrir
                    <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </Button>
                </div>

                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </div>
            );
          })}
        </div>

        {/* CTA */}
        <div className="text-center mt-12">
          <Button variant="cta" size="lg">
            Voir tout le catalogue
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </div>
      </div>
    </section>
  );
};

export default CategoriesSection;