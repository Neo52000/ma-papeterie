import { ArrowRight } from "lucide-react";
import { OptimizedImage } from "@/components/ui/OptimizedImage";

import imgPetitMateriel from "@/assets/categories/petit-materiel.jpg";
import imgEcrire from "@/assets/categories/ecrire-corriger.jpg";
import imgClassement from "@/assets/categories/classement.jpg";
import imgPapiers from "@/assets/categories/papiers.jpg";
import imgConsommables from "@/assets/categories/consommables-info.jpg";
import imgMobilier from "@/assets/categories/mobilier.jpg";
import imgCahiers from "@/assets/categories/cahiers-scolaires.jpg";
import imgEmballage from "@/assets/categories/emballage.jpg";

const categories = [
  {
    name: "Petite Fourniture",
    image: imgPetitMateriel.src,
    href: "/catalogue?category=petit-materiel-bureau-et-ecole",
  },
  {
    name: "Écriture & Correction",
    image: imgEcrire.src,
    href: "/catalogue?category=ecrire-et-corriger",
  },
  {
    name: "Classement",
    image: imgClassement.src,
    href: "/catalogue?category=classement",
  },
  {
    name: "Papier & Dossiers",
    image: imgPapiers.src,
    href: "/catalogue?category=papiers",
  },
  {
    name: "Encre & Toners",
    image: imgConsommables.src,
    href: "/catalogue?category=consommables-informatiques",
  },
  {
    name: "Mobilier & Bureau",
    image: imgMobilier.src,
    href: "/catalogue?category=mobilier",
  },
  {
    name: "Scolaire",
    image: imgCahiers.src,
    href: "/catalogue?category=scolaire",
  },
  {
    name: "Emballage",
    image: imgEmballage.src,
    href: "/solutions-emballage",
  },
];

const HomeCategoryGrid = () => {
  const navigate = (url: string) => { window.location.href = url; };

  return (
    <section className="py-16 bg-[#f9f9ff]">
      <div className="container mx-auto px-4">
        {/* Header with "Voir tout" */}
        <div className="flex items-end justify-between mb-8">
          <h2 className="text-2xl md:text-[2rem] font-semibold text-[#121c2a] font-poppins">
            Explorez nos univers
          </h2>
          <button
            onClick={() => navigate("/catalogue")}
            className="hidden md:flex items-center gap-1 text-[0.875rem] font-medium text-[#121c2a]/50 hover:text-[#1e3a8a] transition-colors font-inter"
          >
            Voir tout le catalogue
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Image-based category grid — 4x2 like Stitch mockup */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {categories.map((cat) => (
            <button
              key={cat.name}
              onClick={() => navigate(cat.href)}
              className="group text-left"
            >
              <div className="relative rounded-[1rem] overflow-hidden aspect-square mb-3">
                <OptimizedImage
                  src={cat.image}
                  alt={cat.name}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  wrapperClassName="w-full h-full"
                  loading="lazy"
                  decoding="async"
                  width={300}
                  height={300}
                />
              </div>
              <h3 className="font-medium text-[0.875rem] text-[#121c2a] font-inter group-hover:text-[#1e3a8a] transition-colors">
                {cat.name}
              </h3>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HomeCategoryGrid;
